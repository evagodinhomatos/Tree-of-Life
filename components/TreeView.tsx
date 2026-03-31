"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findNodeById, findPathToRoot, rankColors } from "@/lib/tree-utils";
import type { AnnotatedTreeNode, TaxonMedia } from "@/lib/types";

type TreeViewProps = {
  data: AnnotatedTreeNode;
  selectedId: string | null;
  compareId: string | null;
  lineageIds: Set<string>;
  compareLineageIds: Set<string>;
  onNodeSelect: (nodeId: string) => void;
  searchTargetId: string | null;
  focusMode: "full" | "lineage" | "relatives";
  onFocusModeChange: (mode: "full" | "lineage" | "relatives") => void;
};

type LayoutNode = {
  node: AnnotatedTreeNode;
  x: number;
  y: number;
  depth: number;
  collapsed: boolean;
};

type LayoutEdge = {
  parentId: string;
  childId: string;
  path: string;
  branchKey: string;
};

const legendItems = [
  { label: "Lineage branch", color: "#8b6a43", kind: "branch" },
  { label: "Alternate lineage", color: "#4e7f52", kind: "branch" },
  { label: "Selected path", color: "#dd7a3c", kind: "active" },
  { label: "Comparison path", color: "#4c7b8f", kind: "compare" },
  { label: "Taxon node", color: "#d8d5ca", kind: "node" },
];

const featuredTaxa = new Set([
  "Crocodylia",
  "Stegosaurus",
  "Triceratops",
  "Pachycephalosaurus",
  "Brachiosaurus",
  "Tyrannosaurus rex",
  "Archaeopteryx",
  "Homo sapiens",
]);

const branchPalette = [
  "#b86b34",
  "#4e7f52",
  "#4c7b8f",
  "#8a5d9f",
  "#8b6a43",
  "#4b8a7d",
  "#9a4f4f",
];

function getChildren(node: AnnotatedTreeNode): AnnotatedTreeNode[] {
  return (node.children ?? []) as AnnotatedTreeNode[];
}

function labelWidthForNode(node: AnnotatedTreeNode) {
  return Math.max(124, node.name.length * 7.9 + 32);
}

function branchKeyForNode(root: AnnotatedTreeNode, node: AnnotatedTreeNode): string {
  if (node.id === root.id) {
    return root.id;
  }

  const parts = node.id.split("/");
  return parts.length >= 3 ? parts.slice(0, 3).join("/") : parts.slice(0, 2).join("/");
}

function buildBranchColorMap(root: AnnotatedTreeNode) {
  const keys = new Set<string>();

  const walk = (node: AnnotatedTreeNode) => {
    keys.add(branchKeyForNode(root, node));
    getChildren(node).forEach(walk);
  };

  walk(root);

  return new Map(
    [...keys].sort().map((key, index) => [key, branchPalette[index % branchPalette.length]]),
  );
}

function clampViewport(
  viewport: { x: number; y: number; scale: number },
  frameSize: { width: number; height: number },
  contentSize: { width: number; height: number },
) {
  const scaledWidth = contentSize.width * viewport.scale;
  const scaledHeight = contentSize.height * viewport.scale;
  const horizontalPadding = 80;
  const verticalPadding = 80;

  const minX =
    scaledWidth <= frameSize.width
      ? (frameSize.width - scaledWidth) / 2
      : frameSize.width - scaledWidth - horizontalPadding;
  const maxX = scaledWidth <= frameSize.width ? minX : horizontalPadding;

  const minY =
    scaledHeight <= frameSize.height
      ? (frameSize.height - scaledHeight) / 2
      : frameSize.height - scaledHeight - verticalPadding;
  const maxY = scaledHeight <= frameSize.height ? minY : verticalPadding;

  return {
    ...viewport,
    x: Math.min(maxX, Math.max(minX, viewport.x)),
    y: Math.min(maxY, Math.max(minY, viewport.y)),
  };
}

function sameViewport(
  left: { x: number; y: number; scale: number },
  right: { x: number; y: number; scale: number },
) {
  return left.x === right.x && left.y === right.y && left.scale === right.scale;
}

function fitViewportToNodes(
  targetNodes: LayoutNode[],
  focusNode: LayoutNode | null,
  frameSize: { width: number; height: number },
  contentSize: { width: number; height: number },
  mode: "full" | "lineage" | "relatives" = "full",
) {
  if (targetNodes.length === 0) {
    return clampViewport({ x: 0, y: 0, scale: 1 }, frameSize, contentSize);
  }

  const bounds = targetNodes.reduce(
    (accumulator, entry) => {
      const labelWidth = labelWidthForNode(entry.node);
      const minX = entry.x - labelWidth * 0.6;
      const maxX = entry.x + labelWidth * 0.85;
      const minY = entry.y - 74;
      const maxY = entry.y + 56;

      return {
        minX: Math.min(accumulator.minX, minX),
        maxX: Math.max(accumulator.maxX, maxX),
        minY: Math.min(accumulator.minY, minY),
        maxY: Math.max(accumulator.maxY, maxY),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  const boundsWidth = Math.max(220, bounds.maxX - bounds.minX);
  const boundsHeight = Math.max(180, bounds.maxY - bounds.minY);
  const availableWidth = Math.max(420, frameSize.width - 320);
  const availableHeight = Math.max(340, frameSize.height - 120);
  const fitScale = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
  const minimumScale =
    mode === "relatives" ? 0.9 : focusNode ? 0.8 : 0.58;
  const nextScale = Math.min(
    focusNode ? 1.22 : 1.08,
    Math.max(minimumScale, fitScale),
  );
  const focusX = frameSize.width * 0.36;
  const focusY = frameSize.height * 0.54;
  const anchorX =
    focusNode?.x ??
    (bounds.minX + bounds.maxX) / 2;
  const anchorY =
    focusNode?.y ??
    (bounds.minY + bounds.maxY) / 2;

  return clampViewport(
    {
      x: focusX - anchorX * nextScale,
      y: focusY - anchorY * nextScale,
      scale: nextScale,
    },
    frameSize,
    contentSize,
  );
}

function collectInitiallyCollapsedIds(
  node: AnnotatedTreeNode,
  depth = 0,
  collapsed = new Set<string>(),
): Set<string> {
  if (depth >= 2 && getChildren(node).length > 0) {
    collapsed.add(node.id);
    return collapsed;
  }

  getChildren(node).forEach((child) =>
    collectInitiallyCollapsedIds(child, depth + 1, collapsed),
  );
  return collapsed;
}

function collectCollapsedIdsOutsidePath(
  node: AnnotatedTreeNode,
  expandedPathIds: Set<string>,
  collapsed = new Set<string>(),
): Set<string> {
  const children = getChildren(node);
  if (children.length === 0) {
    return collapsed;
  }

  if (!expandedPathIds.has(node.id)) {
    collapsed.add(node.id);
    return collapsed;
  }

  children.forEach((child) =>
    collectCollapsedIdsOutsidePath(child, expandedPathIds, collapsed),
  );
  return collapsed;
}

function leafCount(node: AnnotatedTreeNode, collapsedIds: Set<string>): number {
  const children = getChildren(node);

  if (children.length === 0 || collapsedIds.has(node.id)) {
    return 1;
  }

  return children.reduce(
    (total, child) => total + leafCount(child, collapsedIds),
    0,
  );
}

function treeDepth(node: AnnotatedTreeNode, collapsedIds: Set<string>): number {
  const children = getChildren(node);

  if (children.length === 0 || collapsedIds.has(node.id)) {
    return 0;
  }

  return 1 + Math.max(...children.map((child) => treeDepth(child, collapsedIds)));
}

function shouldShowMedallion(node: AnnotatedTreeNode) {
  return (
    featuredTaxa.has(node.name) ||
    node.attributes.rank === "species" ||
    node.attributes.rank === "genus"
  );
}

function shouldRenderLabel(
  node: AnnotatedTreeNode,
  scale: number,
  isSelected: boolean,
  isInLineage: boolean,
  forceVisible: boolean,
) {
  if (forceVisible || isSelected || isInLineage) {
    return true;
  }

  if (scale >= 0.95) {
    return true;
  }

  if (scale >= 0.75) {
    return node.attributes.rank !== "species";
  }

  return featuredTaxa.has(node.name) || getChildren(node).length > 0;
}

function buildLayout(
  root: AnnotatedTreeNode,
  contentWidth: number,
  contentHeight: number,
  collapsedIds: Set<string>,
) {
  const marginX = 90;
  const marginTop = 90;
  const marginBottom = 110;
  const leaves = Math.max(leafCount(root, collapsedIds), 1);
  const depth = Math.max(treeDepth(root, collapsedIds), 1);
  const leafGap = Math.max(
    (contentWidth - marginX * 2) / Math.max(leaves - 1, 1),
    240,
  );
  const depthGap = Math.max((contentHeight - marginTop - marginBottom) / depth, 92);

  let nextLeafIndex = 0;
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  const visit = (
    node: AnnotatedTreeNode,
    currentDepth: number,
  ): { x: number; y: number } => {
    const y = contentHeight - marginBottom - currentDepth * depthGap;
    const isCollapsed = collapsedIds.has(node.id);
    const visibleChildren = isCollapsed ? [] : getChildren(node);

    if (visibleChildren.length === 0) {
      const xBase = leaves === 1 ? contentWidth / 2 : marginX + nextLeafIndex * leafGap;
      const x = xBase + labelWidthForNode(node) * 0.18;
      nextLeafIndex += 1;
      nodes.push({ node, x, y, depth: currentDepth, collapsed: isCollapsed });
      return { x, y };
    }

    const childPoints = visibleChildren.map((child) =>
      visit(child, currentDepth + 1),
    );
    const x =
      childPoints.reduce((sum, point) => sum + point.x, 0) / childPoints.length;

    nodes.push({ node, x, y, depth: currentDepth, collapsed: isCollapsed });

    visibleChildren.forEach((child, index) => {
      const target = childPoints[index];
      const spread = Math.abs(target.x - x);
      const controlOffset = Math.max(36, Math.min(96, spread * 0.24));
      const midpointY = y - depthGap * 0.48;
      const path = [
        `M ${x} ${y}`,
        `C ${x} ${y - controlOffset}, ${target.x} ${midpointY}, ${target.x} ${target.y}`,
      ].join(" ");

      edges.push({
        parentId: node.id,
        childId: child.id,
        branchKey: branchKeyForNode(root, child),
        path,
      });
    });

    return { x, y };
  };

  visit(root, 0);

  return { nodes, edges };
}

function buildLineageLayout(
  root: AnnotatedTreeNode,
  selectedId: string,
  contentWidth: number,
  contentHeight: number,
) {
  const pathIds = selectedId
    .split("/")
    .map((_, index, parts) => parts.slice(0, index + 1).join("/"));
  const pathNodes = pathIds
    .map((id) => findNodeById(root, id))
    .filter((node): node is AnnotatedTreeNode => Boolean(node));

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const topMargin = 140;
  const bottomMargin = 120;
  const usableHeight = Math.max(240, contentHeight - topMargin - bottomMargin);
  const step = pathNodes.length > 1 ? usableHeight / (pathNodes.length - 1) : 0;
  const anchorX = contentWidth * 0.42;

  pathNodes.forEach((node, index) => {
    const y = contentHeight - bottomMargin - index * step;
    nodes.push({
      node,
      x: anchorX,
      y,
      depth: index,
      collapsed: false,
    });

    if (index === 0) {
      return;
    }

    const parent = pathNodes[index - 1];
    const parentY = contentHeight - bottomMargin - (index - 1) * step;
    const midpointY = parentY - step * 0.5;

    edges.push({
      parentId: parent.id,
      childId: node.id,
      branchKey: branchKeyForNode(root, node),
      path: [
        `M ${anchorX} ${parentY}`,
        `C ${anchorX} ${parentY - 28}, ${anchorX} ${midpointY}, ${anchorX} ${y}`,
      ].join(" "),
    });
  });

  return { nodes, edges };
}

function buildComparisonLineageLayout(
  root: AnnotatedTreeNode,
  selectedId: string,
  compareId: string,
  contentWidth: number,
  contentHeight: number,
) {
  const selectedPath = findPathToRoot(root, selectedId);
  const comparePath = findPathToRoot(root, compareId);
  const commonNodes: AnnotatedTreeNode[] = [];

  const limit = Math.min(selectedPath.length, comparePath.length);
  for (let index = 0; index < limit; index += 1) {
    if (selectedPath[index]?.id === comparePath[index]?.id) {
      commonNodes.push(selectedPath[index]);
    } else {
      break;
    }
  }

  const selectedBranch = selectedPath.slice(commonNodes.length);
  const compareBranch = comparePath.slice(commonNodes.length);
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  const topMargin = 140;
  const bottomMargin = 120;
  const totalSegments = Math.max(
    commonNodes.length + Math.max(selectedBranch.length, compareBranch.length) - 1,
    1,
  );
  const usableHeight = Math.max(240, contentHeight - topMargin - bottomMargin);
  const step = usableHeight / totalSegments;
  const centerX = contentWidth * 0.48;
  const branchOffset = Math.min(240, Math.max(150, contentWidth * 0.12));

  const addNode = (node: AnnotatedTreeNode, x: number, y: number, depth: number) => {
    positions.set(node.id, { x, y });
    nodes.push({ node, x, y, depth, collapsed: false });
  };

  commonNodes.forEach((node, index) => {
    const y = contentHeight - bottomMargin - index * step;
    addNode(node, centerX, y, index);

    if (index === 0) {
      return;
    }

    const parent = commonNodes[index - 1];
    const parentPosition = positions.get(parent.id);
    if (!parentPosition) {
      return;
    }

    edges.push({
      parentId: parent.id,
      childId: node.id,
      branchKey: branchKeyForNode(root, node),
      path: [
        `M ${parentPosition.x} ${parentPosition.y}`,
        `C ${parentPosition.x} ${parentPosition.y - 28}, ${centerX} ${y + 28}, ${centerX} ${y}`,
      ].join(" "),
    });
  });

  const sharedNode = commonNodes[commonNodes.length - 1];
  const sharedPosition = sharedNode
    ? positions.get(sharedNode.id) ?? { x: centerX, y: contentHeight - bottomMargin }
    : { x: centerX, y: contentHeight - bottomMargin };

  const addBranch = (branchNodes: AnnotatedTreeNode[], direction: -1 | 1) => {
    branchNodes.forEach((node, index) => {
      const y = sharedPosition.y - (index + 1) * step;
      const x = centerX + branchOffset * direction;
      addNode(node, x, y, commonNodes.length + index);

      const parent = index === 0 ? sharedNode : branchNodes[index - 1];
      const parentPosition = parent ? positions.get(parent.id) : sharedPosition;
      if (!parentPosition) {
        return;
      }

      edges.push({
        parentId: parent?.id ?? root.id,
        childId: node.id,
        branchKey: branchKeyForNode(root, node),
        path: [
          `M ${parentPosition.x} ${parentPosition.y}`,
          `C ${parentPosition.x} ${parentPosition.y - 28}, ${x} ${y + 28}, ${x} ${y}`,
        ].join(" "),
      });
    });
  };

  addBranch(selectedBranch, -1);
  addBranch(compareBranch, 1);

  return { nodes, edges };
}

function collectRelativeIds(node: AnnotatedTreeNode, lineageIds: Set<string>) {
  const relatives = new Set<string>(lineageIds);

  const walk = (currentNode: AnnotatedTreeNode) => {
    const children = getChildren(currentNode);
    if (children.length === 0) {
      return;
    }

    if (lineageIds.has(currentNode.id)) {
      children.forEach((child) => {
        relatives.add(child.id);
        getChildren(child).forEach((grandchild) => relatives.add(grandchild.id));
      });
    }

    children.forEach(walk);
  };

  walk(node);
  return relatives;
}

export default function TreeView({
  data,
  selectedId,
  compareId,
  lineageIds,
  compareLineageIds,
  onNodeSelect,
  searchTargetId,
  focusMode,
  onFocusModeChange,
}: TreeViewProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animatedViewportRef = useRef({ x: 0, y: 0, scale: 1 });
  const hasInitializedRef = useRef(false);
  const [size, setSize] = useState({ width: 1040, height: 920 });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() =>
    collectInitiallyCollapsedIds(data),
  );
  const [mediaMap, setMediaMap] = useState<Record<string, TaxonMedia>>({});
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [animatedViewport, setAnimatedViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const stopViewportAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const syncViewport = useCallback(
    (nextViewport: { x: number; y: number; scale: number }) => {
      stopViewportAnimation();
      setViewport(nextViewport);
      animatedViewportRef.current = nextViewport;
      setAnimatedViewport(nextViewport);
    },
    [stopViewportAnimation],
  );

  const animateViewportTo = useCallback(
    (nextViewport: { x: number; y: number; scale: number }) => {
      stopViewportAnimation();
      setViewport(nextViewport);

      const initial = animatedViewportRef.current;
      const start = performance.now();
      const duration = 320;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);

        const interpolatedViewport = {
          x: initial.x + (nextViewport.x - initial.x) * eased,
          y: initial.y + (nextViewport.y - initial.y) * eased,
          scale: initial.scale + (nextViewport.scale - initial.scale) * eased,
        };
        animatedViewportRef.current = interpolatedViewport;
        setAnimatedViewport(interpolatedViewport);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
        } else {
          animationFrameRef.current = null;
          animatedViewportRef.current = nextViewport;
        }
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [stopViewportAnimation],
  );

  useEffect(() => {
    animatedViewportRef.current = viewport;
    setAnimatedViewport(viewport);
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const width = frameRef.current?.clientWidth ?? 1040;
      const height = width < 760 ? 780 : 920;
      setSize({ width, height });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    if (frameRef.current) {
      observer.observe(frameRef.current);
    }

    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const path = selectedId.split("/");
    setCollapsedIds((current) => {
      const next = new Set(current);
      for (let index = 0; index < path.length; index += 1) {
        const id = path.slice(0, index + 1).join("/");
        next.delete(id);
      }
      return next;
    });
  }, [selectedId]);

  useEffect(() => {
    if (!searchTargetId) {
      return;
    }

    const path = searchTargetId.split("/");
    const expandedPathIds = new Set<string>();
    for (let index = 0; index < path.length; index += 1) {
      expandedPathIds.add(path.slice(0, index + 1).join("/"));
    }

    setCollapsedIds(collectCollapsedIdsOutsidePath(data, expandedPathIds));
  }, [data, searchTargetId]);

  useEffect(() => {
    setCollapsedIds(collectInitiallyCollapsedIds(data));
    hasInitializedRef.current = false;
  }, [data]);

  const contentSize = useMemo(() => {
    const visibleLeaves = Math.max(leafCount(data, collapsedIds), 1);
    const visibleDepth = Math.max(treeDepth(data, collapsedIds), 1);

    return {
      width: Math.max(size.width, visibleLeaves * 255 + 240),
      height: Math.max(size.height, visibleDepth * 120 + 220),
    };
  }, [collapsedIds, data, size.height, size.width]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      const initialViewport = clampViewport({ x: 0, y: 0, scale: 1 }, size, contentSize);
      if (!sameViewport(viewport, initialViewport)) {
        syncViewport(initialViewport);
      }
      hasInitializedRef.current = true;
      return;
    }

    const clampedViewport = clampViewport(viewport, size, contentSize);
    if (!sameViewport(viewport, clampedViewport)) {
      syncViewport(clampedViewport);
    }
  }, [contentSize, size, syncViewport, viewport]);

  const branchColors = useMemo(() => buildBranchColorMap(data), [data]);

  const relativeIds = useMemo(
    () => (selectedId ? collectRelativeIds(data, lineageIds) : new Set<string>()),
    [data, lineageIds, selectedId],
  );

  const comparisonRelativeIds = useMemo(
    () => (compareId ? collectRelativeIds(data, compareLineageIds) : new Set<string>()),
    [compareId, compareLineageIds, data],
  );

  const sharedAncestorId = useMemo(() => {
    if (!selectedId || !compareId) {
      return null;
    }

    const selectedPathIds = selectedId
      .split("/")
      .map((_, index, parts) => parts.slice(0, index + 1).join("/"));
    const comparePathIds = compareId
      .split("/")
      .map((_, index, parts) => parts.slice(0, index + 1).join("/"));
    const limit = Math.min(selectedPathIds.length, comparePathIds.length);
    let sharedId: string | null = null;

    for (let index = 0; index < limit; index += 1) {
      if (selectedPathIds[index] === comparePathIds[index]) {
        sharedId = selectedPathIds[index];
      } else {
        break;
      }
    }

    return sharedId;
  }, [compareId, selectedId]);

  const visibleIds = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    if (focusMode === "lineage") {
      return new Set([...lineageIds, ...compareLineageIds]);
    }

    if (focusMode === "relatives") {
      return new Set([...relativeIds, ...comparisonRelativeIds]);
    }

    return null;
  }, [compareLineageIds, comparisonRelativeIds, focusMode, lineageIds, relativeIds, selectedId]);

  const { nodes, edges } = useMemo(() => {
    if (focusMode === "lineage" && selectedId && compareId) {
      return buildComparisonLineageLayout(
        data,
        selectedId,
        compareId,
        contentSize.width,
        contentSize.height,
      );
    }

    if (focusMode === "lineage" && selectedId) {
      return buildLineageLayout(data, selectedId, contentSize.width, contentSize.height);
    }

    return buildLayout(data, contentSize.width, contentSize.height, collapsedIds);
  }, [collapsedIds, compareId, contentSize.height, contentSize.width, data, focusMode, selectedId]);

  const rootNode = useMemo(
    () => nodes.find(({ node }) => node.id === data.id),
    [data.id, nodes],
  );

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const targetNodes = nodes.filter(({ node }) =>
      visibleIds?.has(node.id) ??
      (lineageIds.has(node.id) || compareLineageIds.has(node.id)),
    );
    const focusNode = compareId
      ? null
      : nodes.find(({ node }) => node.id === (searchTargetId ?? selectedId)) ?? null;
    if (targetNodes.length === 0) {
      return;
    }

    animateViewportTo(
      fitViewportToNodes(targetNodes, focusNode, size, contentSize, focusMode),
    );
  }, [animateViewportTo, compareId, compareLineageIds, contentSize, focusMode, lineageIds, nodes, searchTargetId, selectedId, size, visibleIds]);

  const mediaTargets = useMemo(
    () =>
      nodes
        .filter(({ node }) => (visibleIds ? visibleIds.has(node.id) : true))
        .filter(({ node }) => shouldShowMedallion(node))
        .map(({ node }) => node.name)
        .slice(0, 16),
    [nodes, visibleIds],
  );

  useEffect(() => {
    const missingNames = mediaTargets.filter((name) => !mediaMap[name]);
    if (missingNames.length === 0) {
      return;
    }

    let isMounted = true;

    async function loadMedia() {
      const responses = await Promise.all(
        missingNames.map(async (name) => {
          try {
            const response = await fetch(
              `/api/taxon-media?name=${encodeURIComponent(name)}`,
            );
            if (!response.ok) {
              return [name, { imageUrl: null, source: "none" as const }] as const;
            }

            const media = (await response.json()) as TaxonMedia;
            return [name, media] as const;
          } catch {
            return [name, { imageUrl: null, source: "none" as const }] as const;
          }
        }),
      );

      if (!isMounted) {
        return;
      }

      setMediaMap((current) => {
        const next = { ...current };
        responses.forEach(([name, media]) => {
          next[name] = media;
        });
        return next;
      });
    }

    void loadMedia();

    return () => {
      isMounted = false;
    };
  }, [mediaMap, mediaTargets]);

  const toggleNode = (nodeId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.target instanceof Element && event.target.closest(".poster-node")) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextX = dragState.originX + (event.clientX - dragState.startX);
    const nextY = dragState.originY + (event.clientY - dragState.startY);
    syncViewport(clampViewport({ ...viewport, x: nextX, y: nextY }, size, contentSize));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const zoomDelta = event.deltaY < 0 ? 1.08 : 0.92;

    const nextScale = Math.min(2.4, Math.max(0.55, viewport.scale * zoomDelta));
    const scaleRatio = nextScale / viewport.scale;
    const nextX = pointerX - (pointerX - viewport.x) * scaleRatio;
    const nextY = pointerY - (pointerY - viewport.y) * scaleRatio;

    syncViewport(
      clampViewport(
        {
          x: nextX,
          y: nextY,
          scale: nextScale,
        },
        size,
        contentSize,
      ),
    );
  };

  return (
    <section className="tree-card tree-card-poster">
      <div className="tree-card-header">
        <div>
          <h2 className="tree-card-title">Evolutionary relationships</h2>
          <p className="tree-card-copy">
            A poster-style phylogenetic map. Branch color separates major lineages,
            and the selected lineage is highlighted in amber.
          </p>
        </div>
      </div>

      <div className="tree-card-legend">
        {legendItems.map((item) => (
          <span
            className="legend-pill"
            key={item.label}
            style={{ ["--swatch" as string]: item.color }}
            data-kind={item.kind}
          >
            {item.label}
          </span>
        ))}
      </div>

      <div className="tree-card-toolbar">
        <div className="focus-mode-group" role="tablist" aria-label="Tree focus mode">
          {(["full", "lineage", "relatives"] as const).map((mode) => (
            <button
              aria-selected={focusMode === mode}
              className={
                focusMode === mode ? "focus-mode-button focus-mode-button-active" : "focus-mode-button"
              }
              key={mode}
              onClick={() => onFocusModeChange(mode)}
              role="tab"
              type="button"
            >
              {mode === "full" ? "Full Tree" : mode === "lineage" ? "Lineage" : "Relatives"}
            </button>
          ))}
        </div>
      </div>

      <div className="tree-surface tree-surface-poster" ref={frameRef}>
        <svg
          aria-label="Phylogenetic tree poster"
          className="tree-poster-svg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          role="img"
          viewBox={`0 0 ${size.width} ${size.height}`}
        >
          <g
            transform={`translate(${animatedViewport.x} ${animatedViewport.y}) scale(${animatedViewport.scale})`}
          >
            <g className="tree-poster-grid">
              {Array.from({ length: 7 }).map((_, index) => (
                <line
                  className="tree-poster-guide"
                  key={`guide-${index}`}
                  x1="0"
                  x2={contentSize.width}
                  y1={120 + index * 110}
                  y2={120 + index * 110}
                />
              ))}
            </g>

            <g>
              {edges.map((edge) => {
                const isActive =
                  lineageIds.has(edge.childId) && lineageIds.has(edge.parentId);
                const isCompare =
                  compareLineageIds.has(edge.childId) &&
                  compareLineageIds.has(edge.parentId);
                const isRelative =
                  selectedId !== null &&
                  !isActive &&
                  !isCompare &&
                  relativeIds.has(edge.childId) &&
                  relativeIds.has(edge.parentId);
                const isVisible =
                  visibleIds ? visibleIds.has(edge.childId) && visibleIds.has(edge.parentId) : true;

                if (!isVisible) {
                  return null;
                }

                return (
                  <path
                    className={
                      isActive
                        ? "poster-branch poster-branch-active"
                        : isCompare
                          ? "poster-branch poster-branch-compare"
                        : isRelative
                          ? "poster-branch poster-branch-relative"
                          : selectedId
                            ? "poster-branch poster-branch-muted"
                            : "poster-branch"
                    }
                    d={edge.path}
                    style={
                      ({
                        ["--branch-color" as string]:
                          branchColors.get(edge.branchKey) ?? "#8b6a43",
                      } as CSSProperties)
                    }
                    key={`${edge.parentId}-${edge.childId}`}
                  />
                );
              })}
            </g>

            <g>
              {nodes.map(({ node, x, y, collapsed }) => {
                if (visibleIds && !visibleIds.has(node.id)) {
                  return null;
                }

                const color =
                  rankColors[node.attributes.rank.toLowerCase()] ?? rankColors.default;
                const isSelected = node.id === selectedId;
                const isCompared = node.id === compareId;
                const isSharedAncestor = node.id === sharedAncestorId;
                const isInLineage = lineageIds.has(node.id);
                const isInCompareLineage = compareLineageIds.has(node.id);
                const isHovered = node.id === hoveredId;
                const isRelative =
                  (selectedId !== null && relativeIds.has(node.id)) ||
                  (compareId !== null && comparisonRelativeIds.has(node.id));
                const hasChildren = getChildren(node).length > 0;
                const media = mediaMap[node.name];
                const showMedallion = shouldShowMedallion(node);
                const labelWidth = labelWidthForNode(node);
                const showLabel = shouldRenderLabel(
                  node,
                  animatedViewport.scale,
                  isSelected,
                  isInLineage,
                  Boolean(visibleIds),
                );

                return (
                  <g
                    className={
                      isSelected
                        ? "poster-node poster-node-selected"
                        : isCompared
                          ? "poster-node poster-node-compared"
                        : isHovered
                          ? "poster-node poster-node-hovered"
                          : isRelative
                            ? "poster-node poster-node-relative"
                            : selectedId && !isInLineage
                            ? "poster-node poster-node-muted"
                          : "poster-node"
                    }
                    key={node.id}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId((current) => (current === node.id ? null : current))}
                    transform={`translate(${x}, ${y})`}
                  >
                    {isSharedAncestor ? (
                      <circle className="poster-node-pulse" r="18" />
                    ) : null}
                    <circle
                      className={
                        isSelected
                          ? "poster-node-core poster-node-core-selected"
                          : isCompared
                            ? "poster-node-core poster-node-core-compared"
                            : isInLineage || isInCompareLineage
                            ? "poster-node-core poster-node-core-lineage"
                            : "poster-node-core"
                      }
                      fill={color}
                      onClick={() => onNodeSelect(node.id)}
                      r={isSelected ? 10 : 8}
                    />

                    {showLabel ? (
                      <g
                        className="poster-node-label"
                        onClick={() => onNodeSelect(node.id)}
                        transform={`translate(${-labelWidth / 2}, ${-34})`}
                      >
                        <rect
                          className={isSelected ? "poster-label-box poster-label-box-selected" : "poster-label-box"}
                          height="42"
                          rx="20"
                          ry="20"
                          width={labelWidth}
                          x="0"
                          y="0"
                        />
                        <text className="poster-label-title" x={16} y={18}>
                          {node.name}
                        </text>
                        <text className="poster-label-rank" x={16} y={31}>
                          {node.attributes.rank}
                        </text>
                      </g>
                    ) : null}

                    {showMedallion ? (
                      <g transform={`translate(${labelWidth / 2 + 24}, ${-12})`}>
                        {media?.imageUrl ? null : (
                          <circle className="poster-medallion-fallback" r="24" />
                        )}
                      </g>
                    ) : null}

                    {hasChildren ? (
                      <g
                        className="poster-node-toggle"
                        onClick={() => toggleNode(node.id)}
                        transform={`translate(${labelWidth / 2 - 10}, ${14})`}
                      >
                        <circle r="11" />
                        <text textAnchor="middle" y="4">
                          {collapsed ? "+" : "−"}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </g>

            <g
              transform={`translate(${rootNode?.x ?? contentSize.width / 2}, ${
                contentSize.height - 42
              })`}
            >
              <rect className="poster-origin-chip" height="34" rx="17" ry="17" width="122" x="-61" y="-17" />
              <text className="poster-origin-label" textAnchor="middle" y="5">
                Origin of life
              </text>
            </g>
          </g>
        </svg>
        <div
          className="tree-medallion-layer"
          style={{
            transform: `translate(${animatedViewport.x}px, ${animatedViewport.y}px) scale(${animatedViewport.scale})`,
          }}
        >
          {nodes.map(({ node, x, y }) => {
            if (visibleIds && !visibleIds.has(node.id)) {
              return null;
            }

            const media = mediaMap[node.name];
            if (!media?.imageUrl || !shouldShowMedallion(node)) {
              return null;
            }

            const labelWidth = labelWidthForNode(node);

            return (
              <div
                className="tree-medallion"
                key={`medallion-${node.id}`}
                style={{
                  left: x + labelWidth / 2 - 4,
                  top: y - 40,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={node.name} src={media.imageUrl} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
