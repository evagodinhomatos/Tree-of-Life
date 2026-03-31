import { NextRequest, NextResponse } from "next/server";

const OPEN_TREE_URL = "https://api.opentreeoflife.org/v3/tnrs/match_names";
const ONEZOOM_URL = "https://www.onezoom.org/API/node_images";
const WIKIPEDIA_URL = "https://en.wikipedia.org/api/rest_v1/page/summary";

const curatedMedia: Record<
  string,
  {
    imageUrl: string;
    source: "wikipedia";
    credit: string;
    license: string;
    pageUrl: string;
  }
> = {
  "Tyrannosaurus rex": {
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Tyrannosaurus%20rex%20mmartyniuk.png",
    source: "wikipedia",
    credit: "Matt Martyniuk via Wikimedia Commons",
    license: "Creative Commons",
    pageUrl:
      "https://commons.wikimedia.org/wiki/File:Tyrannosaurus_rex_mmartyniuk.png",
  },
  Tyrannosaurus: {
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Tyrannosaurus%20rex%20mmartyniuk.png",
    source: "wikipedia",
    credit: "Matt Martyniuk via Wikimedia Commons",
    license: "Creative Commons",
    pageUrl:
      "https://commons.wikimedia.org/wiki/File:Tyrannosaurus_rex_mmartyniuk.png",
  },
  Stegosaurus: {
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Stegosaurus%20stenops%20Life%20Reconstruction.png",
    source: "wikipedia",
    credit: "Fred Wierum via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    pageUrl:
      "https://commons.wikimedia.org/wiki/File:Stegosaurus_stenops_Life_Reconstruction.png",
  },
};

async function lookupOttId(name: string) {
  const response = await fetch(OPEN_TREE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      names: [name],
      context_name: "All life",
      do_approximate_matching: false,
    }),
    next: {
      revalidate: 60 * 60 * 24 * 30,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    results?: Array<{
      matches?: Array<{
        taxon?: {
          ott_id?: number;
        };
      }>;
    }>;
  };

  return data.results?.[0]?.matches?.[0]?.taxon?.ott_id ?? null;
}

async function lookupOneZoomImage(ottId: number) {
  const response = await fetch(`${ONEZOOM_URL}?key=0&otts=${ottId}&type=any`, {
    next: {
      revalidate: 60 * 60 * 24 * 30,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    images?: Record<string, [string, string, string, string, number]>;
  };

  const image = data.images?.[String(ottId)];
  if (!image?.[1]) {
    return null;
  }

  return {
    imageUrl: image[1],
    credit: image[2],
    license: image[3],
    ottId,
    source: "onezoom" as const,
    pageUrl: `https://www.onezoom.org/life/@=${ottId}`,
  };
}

async function lookupWikipediaImage(name: string) {
  const response = await fetch(`${WIKIPEDIA_URL}/${encodeURIComponent(name)}`, {
    headers: {
      accept: "application/json",
    },
    next: {
      revalidate: 60 * 60 * 24 * 30,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    originalimage?: { source?: string };
    thumbnail?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
  };

  const imageUrl = data.originalimage?.source ?? data.thumbnail?.source;
  if (!imageUrl) {
    return null;
  }

  return {
    imageUrl,
    source: "wikipedia" as const,
    pageUrl: data.content_urls?.desktop?.page,
    credit: "Wikipedia / Wikimedia Commons",
  };
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Missing required query parameter: name" },
      { status: 400 },
    );
  }

  try {
    const override = curatedMedia[name];
    if (override) {
      const ottId = await lookupOttId(name);
      return NextResponse.json({
        ...override,
        ottId: ottId ?? undefined,
      });
    }

    const ottId = await lookupOttId(name);

    if (ottId) {
      const oneZoomMedia = await lookupOneZoomImage(ottId);
      if (oneZoomMedia) {
        return NextResponse.json(oneZoomMedia);
      }
    }

    const wikipediaMedia = await lookupWikipediaImage(name);
    if (wikipediaMedia) {
      return NextResponse.json({
        ...wikipediaMedia,
        ottId: ottId ?? undefined,
      });
    }

    return NextResponse.json({
      imageUrl: null,
      source: "none",
      ottId: ottId ?? undefined,
    });
  } catch {
    return NextResponse.json(
      {
        imageUrl: null,
        source: "none",
      },
      { status: 200 },
    );
  }
}
