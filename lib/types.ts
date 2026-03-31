export type TreeNodeAttributes = {
  rank: string;
  description?: string;
  period?: string;
};

export type TreeNodeDatum = {
  name: string;
  attributes: TreeNodeAttributes;
  children?: TreeNodeDatum[];
};

export type AnnotatedTreeNode = TreeNodeDatum & {
  id: string;
  parentId?: string;
  children?: AnnotatedTreeNode[];
};

export type TaxonMedia = {
  imageUrl: string | null;
  source: "onezoom" | "wikipedia" | "none";
  credit?: string;
  license?: string;
  pageUrl?: string;
  ottId?: number;
};
