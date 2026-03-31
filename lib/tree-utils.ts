import type { AnnotatedTreeNode, TreeNodeDatum } from "@/lib/types";

export const rankColors: Record<string, string> = {
  clade: "#3b6f59",
  group: "#5d7d3a",
  family: "#a86b30",
  genus: "#b44d2f",
  species: "#6f3f7f",
  default: "#4f5b46",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function annotateTree(
  node: TreeNodeDatum,
  parentId?: string,
): AnnotatedTreeNode {
  const id = parentId ? `${parentId}/${slugify(node.name)}` : slugify(node.name);

  return {
    ...node,
    id,
    parentId,
    children: node.children?.map((child) => annotateTree(child, id)),
  };
}

export function findNodeById(
  node: AnnotatedTreeNode,
  nodeId: string,
): AnnotatedTreeNode | null {
  if (node.id === nodeId) {
    return node;
  }

  for (const child of node.children ?? []) {
    const match = findNodeById(child, nodeId);
    if (match) {
      return match;
    }
  }

  return null;
}

export function findPathToRoot(
  node: AnnotatedTreeNode,
  nodeId: string,
): AnnotatedTreeNode[] {
  if (node.id === nodeId) {
    return [node];
  }

  for (const child of node.children ?? []) {
    const childPath = findPathToRoot(child, nodeId);
    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }

  return [];
}

export function collectMatches(
  node: AnnotatedTreeNode,
  query: string,
): AnnotatedTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const matches: AnnotatedTreeNode[] = [];

  const traverse = (currentNode: AnnotatedTreeNode) => {
    if (currentNode.name.toLowerCase().includes(normalizedQuery)) {
      matches.push(currentNode);
    }

    currentNode.children?.forEach(traverse);
  };

  traverse(node);
  return matches;
}
