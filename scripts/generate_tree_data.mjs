import { writeFile } from "node:fs/promises";
import path from "node:path";

const TNRS_URL = "https://api.opentreeoflife.org/v3/tnrs/match_names";
const TAXON_INFO_URL = "https://api.opentreeoflife.org/v3/taxonomy/taxon_info";
const SUBTREE_URL = "https://api.opentreeoflife.org/v3/tree_of_life/subtree";

const taxa = [
  "Ichthyosaurus communis",
  "Ophthalmosaurus icenicus",
  "Plesiosaurus dolichodeirus",
  "Elasmosaurus platyurus",
  "Mosasaurus hoffmannii",
  "Tylosaurus proriger",
  "Liopleurodon ferox",
  "Tanystropheus longobardicus",
  "Nothosaurus mirabilis",
  "Henodus chelyops",
  "Pteranodon longiceps",
  "Quetzalcoatlus northropi",
  "Rhamphorhynchus muensteri",
  "Dimorphodon macronyx",
  "Dsungaripterus weii",
  "Dilophosaurus wetherilli",
  "Allosaurus fragilis",
  "Velociraptor mongoliensis",
  "Spinosaurus aegyptiacus",
  "Carnotaurus sastrei",
  "Giganotosaurus carolinii",
  "Dilong paradoxus",
  "Albertosaurus sarcophagus",
  "Ceratosaurus nasicornis",
  "Torvosaurus tanneri",
  "Utahraptor ostrommaysorum",
  "Deinonychus antirrhopus",
  "Oviraptor philoceratops",
  "Gallimimus bullatus",
  "Therizinosaurus cheloniformis",
  "Tyrannosaurus rex",
  "Triceratops horridus",
  "Ankylosaurus magniventris",
  "Parasaurolophus walkeri",
  "Iguanodon bernissartensis",
  "Edmontosaurus annectens",
  "Corythosaurus casuarius",
  "Styracosaurus albertensis",
  "Protoceratops andrewsi",
  "Euoplocephalus tutus",
  "Kentrosaurus aethiopicus",
  "Pachyrhinosaurus canadensis",
  "Stegosaurus stenops",
  "Brachiosaurus altithorax",
  "Diplodocus carnegii",
  "Apatosaurus ajax",
  "Argentinosaurus huinculensis",
  "Plateosaurus engelhardti",
  "Camarasaurus supremus",
  "Saltasaurus loricatus",
  "Shunosaurus lii",
  "Archaeopteryx lithographica",
  "Pachycephalosaurus wyomingensis",
  "Crocodylus niloticus",
  "Alligator mississippiensis",
  "Varanus komodoensis",
  "Python regius",
  "Chelonia mydas",
  "Gallus gallus",
  "Struthio camelus",
  "Falco peregrinus",
  "Aptenodytes forsteri",
  "Pavo cristatus",
  "Corvus corax",
  "Haliaeetus leucocephalus",
  "Salmo salar",
  "Oncorhynchus mykiss",
  "Danio rerio",
  "Latimeria chalumnae",
  "Carcharodon carcharias",
  "Sphyrna mokarran",
  "Rhincodon typus",
  "Galeocerdo cuvier",
  "Carcharhinus leucas",
  "Prionace glauca",
  "Isurus oxyrinchus",
  "Alopias vulpinus",
  "Squalus acanthias",
  "Hydrolagus colliei",
  "Hippocampus kuda",
  "Thunnus thynnus",
  "Mola mola",
  "Mobula birostris",
  "Chelonia mydas",
  "Dermochelys coriacea",
  "Amblyrhynchus cristatus",
  "Xenopus laevis",
  "Ambystoma mexicanum",
  "Rana temporaria",
  "Panthera leo",
  "Panthera tigris",
  "Panthera pardus",
  "Canis lupus",
  "Vulpes vulpes",
  "Felis catus",
  "Ursus arctos",
  "Balaenoptera musculus",
  "Orcinus orca",
  "Delphinus delphis",
  "Physeter macrocephalus",
  "Tursiops truncatus",
  "Megaptera novaeangliae",
  "Balaena mysticetus",
  "Monodon monoceros",
  "Ziphius cavirostris",
  "Trichechus manatus",
  "Leptonychotes weddellii",
  "Mirounga leonina",
  "Elephas maximus",
  "Loxodonta africana",
  "Ornithorhynchus anatinus",
  "Macropus rufus",
  "Phascolarctos cinereus",
  "Homo sapiens",
  "Pan troglodytes",
  "Gorilla gorilla",
  "Pongo abelii",
  "Lemur catta",
  "Macaca mulatta",
  "Papio anubis",
  "Mandrillus sphinx",
  "Ateles geoffroyi",
  "Cebus capucinus",
  "Saimiri sciureus",
  "Tarsius tarsier",
  "Nycticebus coucang",
  "Bos taurus",
  "Ovis aries",
  "Sus scrofa",
  "Equus caballus",
  "Rhinoceros unicornis",
  "Giraffa camelopardalis",
  "Antilocapra americana",
  "Cervus elaphus",
  "Bison bison",
  "Camelus dromedarius",
  "Hippopotamus amphibius",
  "Tapirus terrestris",
  "Mus musculus",
  "Rattus norvegicus",
  "Pteropus vampyrus",
  "Loxodonta cyclotis",
  "Drosophila melanogaster",
  "Apis mellifera",
  "Danaus plexippus",
  "Bombyx mori",
  "Anopheles gambiae",
  "Atta cephalotes",
  "Octopus vulgaris",
  "Sepia officinalis",
  "Nautilus pompilius",
  "Architeuthis dux",
  "Loligo vulgaris",
  "Limulus polyphemus",
  "Homarus americanus",
  "Cancer pagurus",
  "Asterias rubens",
  "Strongylocentrotus purpuratus",
  "Caenorhabditis elegans",
  "Lumbricus terrestris",
  "Helix pomatia",
  "Metridium senile",
  "Aurelia aurita",
  "Acropora cervicornis",
  "Dugesia japonica",
  "Arabidopsis thaliana",
  "Quercus robur",
  "Zea mays",
  "Oryza sativa",
  "Triticum aestivum",
  "Solanum lycopersicum",
  "Solanum tuberosum",
  "Rosa canina",
  "Nymphaea alba",
  "Pinus sylvestris",
  "Ginkgo biloba",
  "Pteridium aquilinum",
  "Sphagnum palustre",
  "Agaricus bisporus",
  "Saccharomyces cerevisiae",
  "Amanita muscaria",
  "Penicillium chrysogenum",
  "Neurospora crassa",
  "Chlamydomonas reinhardtii",
  "Emiliania huxleyi",
  "Paramecium tetraurelia",
  "Plasmodium falciparum",
  "Physarum polycephalum",
];

const cladeRequests = [
  { name: "Ornithischia", heightLimit: 3 },
  { name: "Ceratopsidae", heightLimit: 3 },
  { name: "Hadrosauridae", heightLimit: 3 },
  { name: "Ankylosauria", heightLimit: 3 },
  { name: "Stegosauria", heightLimit: 3 },
  { name: "Sauropoda", heightLimit: 3 },
  { name: "Diplodocidae", heightLimit: 3 },
  { name: "Titanosauria", heightLimit: 3 },
  { name: "Coelurosauria", heightLimit: 3 },
  { name: "Dromaeosauridae", heightLimit: 3 },
  { name: "Tyrannosauridae", heightLimit: 3 },
  { name: "Mammalia", heightLimit: 3 },
  { name: "Theria", heightLimit: 3 },
  { name: "Cetacea", heightLimit: 3 },
  { name: "Carnivora", heightLimit: 3 },
  { name: "Primates", heightLimit: 3 },
  { name: "Haplorrhini", heightLimit: 3 },
  { name: "Catarrhini", heightLimit: 3 },
  { name: "Platyrrhini", heightLimit: 3 },
  { name: "Artiodactyla", heightLimit: 3 },
  { name: "Perissodactyla", heightLimit: 3 },
  { name: "Ruminantia", heightLimit: 3 },
  { name: "Pinnipedia", heightLimit: 3 },
  { name: "Mysticeti", heightLimit: 3 },
  { name: "Odontoceti", heightLimit: 3 },
  { name: "Aves", heightLimit: 3 },
  { name: "Magnoliopsida", heightLimit: 3 },
  { name: "Arthropoda", heightLimit: 3 },
  { name: "Mollusca", heightLimit: 3 },
  { name: "Actinopterygii", heightLimit: 3 },
  { name: "Chondrichthyes", heightLimit: 3 },
  { name: "Selachimorpha", heightLimit: 3 },
  { name: "Batoidea", heightLimit: 3 },
  { name: "Holocephali", heightLimit: 3 },
  { name: "Cnidaria", heightLimit: 3 },
  { name: "Cephalopoda", heightLimit: 3 },
  { name: "Sauropterygia", heightLimit: 3 },
  { name: "Ichthyosauria", heightLimit: 3 },
  { name: "Mosasauridae", heightLimit: 3 },
  { name: "Pterosauria", heightLimit: 3 },
  { name: "Pterodactyloidea", heightLimit: 3 },
];

const rankMap = {
  "no rank": "clade",
  subphylum: "phylum",
  superclass: "clade",
  subclass: "clade",
  superorder: "group",
  infraorder: "group",
  suborder: "group",
  parvorder: "group",
  superfamily: "family",
  subfamily: "family",
  domain: "domain",
  kingdom: "kingdom",
  phylum: "phylum",
  class: "class",
  order: "order",
  family: "family",
  genus: "genus",
  species: "species",
};

const overrides = {
  life: {
    rank: "domain",
    description:
      "The shared origin point for every lineage represented in this explorer dataset.",
  },
  Eukaryota: {
    description:
      "Organisms whose cells contain nuclei and other membrane-bound organelles.",
  },
  Opisthokonta: {
    description:
      "A major eukaryotic branch that includes animals, fungi, and their closest single-celled relatives.",
  },
  Metazoa: {
    description:
      "Multicellular animals with specialized tissues and complex developmental programs.",
  },
  Chordata: {
    description:
      "Animals that possess a notochord at some stage of development.",
  },
  Dinosauria: {
    period: "Mesozoic",
    description:
      "A major reptile radiation that dominated terrestrial ecosystems for much of the Mesozoic Era.",
  },
  Saurischia: {
    description:
      "The lizard-hipped dinosaur lineage that includes theropods and sauropodomorphs.",
  },
  Ornithischia: {
    description:
      "Bird-hipped dinosaurs, including horned, plated, and dome-headed herbivores.",
  },
  Theropoda: {
    description:
      "Mostly bipedal saurischians that include iconic predators and the ancestry of birds.",
  },
  Sauropodomorpha: {
    description:
      "Long-necked herbivorous dinosaurs and their close relatives.",
  },
  Sauropoda: {
    description:
      "The classic giant long-necked dinosaurs, including diplodocids, brachiosaurids, and titanosaurs.",
  },
  Ceratopsidae: {
    description:
      "A family of large horned dinosaurs with elaborate frills and facial ornamentation.",
  },
  Hadrosauridae: {
    description:
      "Duck-billed herbivorous dinosaurs that became especially diverse in the Late Cretaceous.",
  },
  Dromaeosauridae: {
    description:
      "Bird-like predatory theropods often equipped with enlarged sickle claws.",
  },
  Tyrannosauridae: {
    description:
      "Large-bodied tyrannosauroids with robust skulls and powerful bite forces.",
  },
  Diplodocidae: {
    description:
      "A family of whip-tailed sauropods with elongated necks and tails.",
  },
  Titanosauria: {
    description:
      "A widespread sauropod clade that includes some of the largest terrestrial animals ever known.",
  },
  Sauropterygia: {
    description:
      "Marine reptiles including plesiosaurs, pliosaurs, and their Triassic relatives.",
  },
  Ichthyosauria: {
    description:
      "Highly specialized marine reptiles that evolved fish-like bodies and powerful tails.",
  },
  Mosasauridae: {
    description:
      "Large marine squamates that dominated Late Cretaceous seas.",
  },
  Dilophosaurus: {
    period: "Early Jurassic",
    description:
      "An early theropod genus best known from the Kayenta Formation of Arizona.",
  },
  "Dilophosaurus wetherilli": {
    period: "Early Jurassic",
    description:
      "The type species of Dilophosaurus, recognized for the paired crests on its skull.",
  },
  Allosaurus: {
    period: "Late Jurassic",
    description:
      "A large predatory theropod common in the Morrison Formation of North America.",
  },
  Ichthyosaurus: {
    period: "Early Jurassic",
    description:
      "A classic ichthyosaur genus from the Early Jurassic seas of Europe.",
  },
  Ophthalmosaurus: {
    period: "Late Jurassic",
    description:
      "A large-eyed ichthyosaur adapted for deep-water hunting.",
  },
  Plesiosaurus: {
    period: "Early Jurassic",
    description:
      "A long-necked marine reptile that helped define the classic plesiosaur body plan.",
  },
  Elasmosaurus: {
    period: "Late Cretaceous",
    description:
      "An extremely long-necked plesiosaur from the Western Interior Seaway.",
  },
  Mosasaurus: {
    period: "Late Cretaceous",
    description:
      "A giant marine lizard that ruled Late Cretaceous oceans.",
  },
  Tylosaurus: {
    period: "Late Cretaceous",
    description:
      "A large predatory mosasaur from the Western Interior Seaway of North America.",
  },
  Liopleurodon: {
    period: "Middle Jurassic",
    description:
      "A short-necked pliosaur with a powerful skull and formidable bite.",
  },
  Nothosaurus: {
    period: "Triassic",
    description:
      "A semi-aquatic sauropterygian from shallow Triassic seas.",
  },
  Pteranodon: {
    period: "Late Cretaceous",
    description:
      "A large toothless pterosaur with an elongated cranial crest and broad wings.",
  },
  Quetzalcoatlus: {
    period: "Late Cretaceous",
    description:
      "One of the largest known flying animals, an azhdarchid pterosaur with a vast wingspan.",
  },
  Rhamphorhynchus: {
    period: "Late Jurassic",
    description:
      "A long-tailed pterosaur with a distinctive tail vane and fish-catching teeth.",
  },
  Dimorphodon: {
    period: "Early Jurassic",
    description:
      "An early pterosaur with a large head and two distinct tooth forms.",
  },
  Dsungaripterus: {
    period: "Early Cretaceous",
    description:
      "A robust pterosaur with an upturned snout and crushing teeth adapted for shelled prey.",
  },
  Ceratosaurus: {
    period: "Late Jurassic",
    description:
      "A horned theropod predator from the Morrison Formation.",
  },
  Torvosaurus: {
    period: "Late Jurassic",
    description:
      "A large megalosauroid theropod with powerful jaws and robust forelimbs.",
  },
  Velociraptor: {
    period: "Late Cretaceous",
    description:
      "A small feathered dromaeosaurid theropod from Late Cretaceous Asia.",
  },
  Utahraptor: {
    period: "Early Cretaceous",
    description:
      "A giant dromaeosaurid predator with enlarged sickle claws.",
  },
  Deinonychus: {
    period: "Early Cretaceous",
    description:
      "A highly influential dromaeosaurid whose discovery reshaped ideas about dinosaur biology.",
  },
  Oviraptor: {
    period: "Late Cretaceous",
    description:
      "A beaked maniraptoran theropod once miscast as an egg thief.",
  },
  Gallimimus: {
    period: "Late Cretaceous",
    description:
      "A fast, ostrich-like ornithomimosaur from Mongolia.",
  },
  Therizinosaurus: {
    period: "Late Cretaceous",
    description:
      "A bizarre plant-eating theropod with enormous manual claws.",
  },
  Spinosaurus: {
    period: "Late Cretaceous",
    description:
      "A distinctive semi-aquatic theropod with elongated jaws and a tall dorsal sail.",
  },
  Carnotaurus: {
    period: "Late Cretaceous",
    description:
      "A horned abelisaurid theropod with short skull horns and reduced forelimbs.",
  },
  Giganotosaurus: {
    period: "Late Cretaceous",
    description:
      "A gigantic carcharodontosaurid predator from Patagonia.",
  },
  Dilong: {
    period: "Early Cretaceous",
    description:
      "A small feathered tyrannosauroid illustrating the early evolution of the tyrant lineage.",
  },
  Albertosaurus: {
    period: "Late Cretaceous",
    description:
      "A gracile tyrannosaurid from western North America.",
  },
  Tyrannosaurus: {
    period: "Late Cretaceous",
    description:
      "A giant tyrannosaurid genus that lived in western North America.",
  },
  "Tyrannosaurus rex": {
    period: "Late Cretaceous",
    description:
      "The best-known tyrannosaur species, famous for its massive skull and crushing bite.",
  },
  Triceratops: {
    period: "Late Cretaceous",
    description:
      "A large horned ceratopsian with three facial horns and a broad cranial frill.",
  },
  "Triceratops horridus": {
    period: "Late Cretaceous",
    description:
      "One of the classic horned dinosaur species from the latest Cretaceous of North America.",
  },
  Ankylosaurus: {
    period: "Late Cretaceous",
    description:
      "A heavily armored ankylosaurid with a powerful tail club.",
  },
  Parasaurolophus: {
    period: "Late Cretaceous",
    description:
      "A duck-billed dinosaur famous for its long hollow cranial crest.",
  },
  Iguanodon: {
    period: "Early Cretaceous",
    description:
      "A robust ornithopod herbivore notable for its spike-like thumb.",
  },
  Edmontosaurus: {
    period: "Late Cretaceous",
    description:
      "A widespread hadrosaurid herbivore from the latest Cretaceous of North America.",
  },
  Corythosaurus: {
    period: "Late Cretaceous",
    description:
      "A crested lambeosaurine hadrosaur with a helmet-like skull crest.",
  },
  Styracosaurus: {
    period: "Late Cretaceous",
    description:
      "A ceratopsid with a spectacular frill decorated by long spikes.",
  },
  Protoceratops: {
    period: "Late Cretaceous",
    description:
      "A smaller ceratopsian from Mongolia that sits outside Ceratopsidae.",
  },
  Euoplocephalus: {
    period: "Late Cretaceous",
    description:
      "A heavily armored ankylosaur with a broad body and tail club.",
  },
  Kentrosaurus: {
    period: "Late Jurassic",
    description:
      "A stegosaur with long shoulder spikes and plates extending down the back.",
  },
  Pachyrhinosaurus: {
    period: "Late Cretaceous",
    description:
      "A ceratopsid distinguished by a thickened nasal boss rather than long brow horns.",
  },
  Stegosaurus: {
    period: "Late Jurassic",
    description:
      "A plated dinosaur known for its alternating dorsal armor and tail spikes.",
  },
  Brachiosaurus: {
    period: "Late Jurassic",
    description:
      "A towering sauropod with elongated forelimbs and a giraffe-like browsing posture.",
  },
  Diplodocus: {
    period: "Late Jurassic",
    description:
      "A long, whip-tailed diplodocid sauropod from the Morrison Formation.",
  },
  Apatosaurus: {
    period: "Late Jurassic",
    description:
      "A massive diplodocid sauropod with a deep neck and heavy build.",
  },
  Camarasaurus: {
    period: "Late Jurassic",
    description:
      "A common Morrison Formation sauropod with spoon-shaped teeth and a stout skull.",
  },
  Saltasaurus: {
    period: "Late Cretaceous",
    description:
      "A relatively small armored titanosaur from South America.",
  },
  Shunosaurus: {
    period: "Middle Jurassic",
    description:
      "A Chinese sauropod notable for the club-like structure at the end of its tail.",
  },
  Argentinosaurus: {
    period: "Late Cretaceous",
    description:
      "One of the largest known titanosaurs, represented by enormous fragmentary remains.",
  },
  Plateosaurus: {
    period: "Late Triassic",
    description:
      "A basal sauropodomorph from the Late Triassic of Europe.",
  },
  Archaeopteryx: {
    period: "Late Jurassic",
    description:
      "A classic transitional fossil showing both dinosaurian and avian traits.",
  },
  Pachycephalosaurus: {
    period: "Late Cretaceous",
    description:
      "A dome-headed herbivorous dinosaur notable for its thickened skull roof.",
  },
  Homo: {
    description:
      "The hominin genus that includes modern humans and several extinct relatives.",
  },
  "Homo sapiens": {
    period: "Quaternary",
    description:
      "The only surviving human species, distinguished by symbolic behavior and cumulative culture.",
  },
  Mammalia: {
    description:
      "Warm-blooded vertebrates with hair, mammary glands, and highly varied body plans.",
  },
  Cetacea: {
    description:
      "Fully aquatic mammals including whales, dolphins, and porpoises.",
  },
  Mysticeti: {
    description:
      "Baleen whales that filter-feed using keratinous plates instead of teeth.",
  },
  Odontoceti: {
    description:
      "Toothed whales including dolphins, porpoises, sperm whales, and beaked whales.",
  },
  Pinnipedia: {
    description:
      "Marine carnivorans including seals, sea lions, and walruses.",
  },
  Carnivora: {
    description:
      "Mammals specialized for meat-eating to varying degrees, including cats, dogs, bears, and seals.",
  },
  Haplorrhini: {
    description:
      "The dry-nosed primates, including tarsiers, monkeys, apes, and humans.",
  },
  Catarrhini: {
    description:
      "Old World monkeys and apes, including humans and their closest relatives.",
  },
  Platyrrhini: {
    description:
      "New World monkeys native to Central and South America.",
  },
  Ruminantia: {
    description:
      "Even-toed ungulates that ferment plant matter in a complex stomach.",
  },
  Artiodactyla: {
    description:
      "Even-toed hoofed mammals including deer, cattle, hippos, pigs, and whales by modern classification.",
  },
  Perissodactyla: {
    description:
      "Odd-toed ungulates such as horses, rhinoceroses, and tapirs.",
  },
  Actinopterygii: {
    description:
      "Ray-finned fishes, the dominant fish radiation in modern aquatic ecosystems.",
  },
  Chondrichthyes: {
    description:
      "Cartilaginous fishes including sharks, rays, and chimaeras.",
  },
  Rhincodon: {
    description:
      "The whale shark genus, comprising the largest living fish.",
  },
  Galeocerdo: {
    description:
      "Tiger sharks, large requiem sharks known for broad diets and oceanic range.",
  },
  Carcharhinus: {
    description:
      "A speciose requiem shark genus that includes many familiar coastal and pelagic sharks.",
  },
  Prionace: {
    description:
      "The blue shark genus, adapted for wide-ranging pelagic life.",
  },
  Isurus: {
    description:
      "Mako sharks, fast-swimming lamnid predators of the open ocean.",
  },
  Alopias: {
    description:
      "Thresher sharks, recognized by their extremely elongated upper tail lobes.",
  },
  Squalus: {
    description:
      "Dogfish sharks, a widespread group of smaller spiny sharks.",
  },
  Hydrolagus: {
    description:
      "A chimaera genus representing the holocephalan branch of cartilaginous fishes.",
  },
  Selachimorpha: {
    description:
      "The shark lineage of cartilaginous fishes, including reef hunters, giants, and deep-water forms.",
  },
  Batoidea: {
    description:
      "Rays and skates, flattened cartilaginous fishes often adapted to life near the seafloor.",
  },
  Holocephali: {
    description:
      "Chimaeras, an ancient cartilaginous fish lineage distinct from sharks and rays.",
  },
  Cephalopoda: {
    description:
      "A highly active molluscan clade including octopuses, squids, cuttlefishes, and nautiluses.",
  },
  Cnidaria: {
    description:
      "Marine-dominated animals such as corals, sea anemones, and jellyfishes.",
  },
  Primates: {
    description:
      "Mammals adapted for grasping, visually guided behavior, and complex sociality.",
  },
  Aves: {
    description:
      "The bird lineage of feathered theropods, specialized for flight or its secondary loss.",
  },
  Pterosauria: {
    description:
      "The flying archosaurs that shared Mesozoic skies with dinosaurs and early birds.",
  },
  Pterodactyloidea: {
    description:
      "A derived pterosaur clade including giants like Pteranodon and Quetzalcoatlus.",
  },
  Angiosperms: {
    description:
      "Flowering plants whose seeds develop within enclosed ovaries.",
  },
  Fungi: {
    description:
      "Eukaryotes that absorb nutrients from organic matter and often form extensive filamentous networks.",
  },
};

function normalizeRank(rank, name) {
  if (overrides[name]?.rank) {
    return overrides[name].rank;
  }

  return rankMap[rank] ?? "clade";
}

function makeDescription(name, rank, parentName) {
  if (overrides[name]?.description) {
    return overrides[name].description;
  }

  const article = /^[aeiou]/i.test(rank) ? "An" : "A";
  if (parentName) {
    return `${article} ${rank} within ${parentName} represented in this explorer dataset.`;
  }

  return `${article} ${rank} represented in this explorer dataset.`;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${url} (${response.status})`);
  }

  return response.json();
}

function insertPath(root, pathNodes) {
  let current = root;

  for (let index = 1; index < pathNodes.length; index += 1) {
    const item = pathNodes[index];
    const existingChildren = current.children ?? [];
    let child = existingChildren.find((entry) => entry.name === item.name);

    if (!child) {
      child = {
        name: item.name,
        attributes: item.attributes,
        children: [],
      };
      existingChildren.push(child);
      current.children = existingChildren;
    } else {
      child.attributes = {
        ...child.attributes,
        ...item.attributes,
      };
    }

    current = child;
  }
}

function sortTree(node) {
  if (node.children?.length) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortTree);
  }
}

function makeNodeAttributes(name, rank, parentName) {
  return {
    rank: normalizeRank(rank, name),
    period: overrides[name]?.period,
    description: makeDescription(
      name,
      normalizeRank(rank, name),
      parentName,
    ),
  };
}

function mergeNode(target, source) {
  target.attributes = {
    ...target.attributes,
    ...source.attributes,
  };

  const sourceChildren = source.children ?? [];
  if (sourceChildren.length === 0) {
    return;
  }

  const targetChildren = target.children ?? [];
  sourceChildren.forEach((sourceChild) => {
    const existing = targetChildren.find((entry) => entry.name === sourceChild.name);
    if (existing) {
      mergeNode(existing, sourceChild);
    } else {
      targetChildren.push(sourceChild);
    }
  });
  target.children = targetChildren;
}

function mergeSubtree(root, subtree) {
  if (root.name !== subtree.name) {
    throw new Error(`Cannot merge subtree root ${subtree.name} into ${root.name}`);
  }

  mergeNode(root, subtree);
}

function convertArgusonNode(node, parentName = null) {
  const taxonName = node.taxon?.name ?? null;
  const rank = node.taxon?.rank ?? "no rank";
  const childNodes = (node.children ?? [])
    .map((child) => convertArgusonNode(child, taxonName ?? parentName))
    .flat()
    .filter(Boolean);

  if (!taxonName) {
    return childNodes;
  }

  return [
    {
      name: taxonName,
      attributes: makeNodeAttributes(taxonName, rank, parentName),
      children: childNodes,
    },
  ];
}

async function main() {
  const allRequestedNames = [...new Set([...taxa, ...cladeRequests.map((item) => item.name)])];
  const tnrs = await postJson(TNRS_URL, {
    names: allRequestedNames,
    context_name: "All life",
    do_approximate_matching: true,
  });

  const matches = new Map();
  for (const result of tnrs.results ?? []) {
    const match = result.matches?.[0];
    if (match?.taxon?.ott_id) {
      matches.set(result.name, {
        ottId: match.taxon.ott_id,
        canonicalName: match.taxon.name,
      });
    }
  }

  const unresolved = allRequestedNames.filter((name) => !matches.has(name));
  if (unresolved.length > 0) {
    console.warn(`Skipping unresolved names: ${unresolved.join(", ")}`);
  }

  const infos = [];
  for (const name of taxa.filter((entry) => matches.has(entry))) {
    const match = matches.get(name);
    const info = await postJson(TAXON_INFO_URL, {
      ott_id: match.ottId,
      include_lineage: true,
    });
    infos.push(info);
  }

  const root = {
    name: "life",
    attributes: {
      rank: "domain",
      description: overrides.life.description,
    },
    children: [],
  };

  for (const info of infos) {
    const lineage = [...(info.lineage ?? [])].reverse();
    const path = [...lineage, info]
      .filter((entry) => entry.name !== "cellular organisms")
      .map((entry, index, all) => ({
        name: entry.name,
        attributes: makeNodeAttributes(entry.name, entry.rank, all[index - 1]?.name),
      }));

    if (path[0]?.name.toLowerCase() !== "life") {
      path.unshift({
        name: "life",
        attributes: {
          rank: "domain",
          description: overrides.life.description,
        },
      });
    }

    insertPath(root, path);
  }

  for (const cladeRequest of cladeRequests) {
    const match = matches.get(cladeRequest.name);
    if (!match) {
      console.warn(`Skipping unresolved clade request: ${cladeRequest.name}`);
      continue;
    }

    const cladeInfo = await postJson(TAXON_INFO_URL, {
      ott_id: match.ottId,
      include_lineage: true,
    });
    let subtree;
    try {
      subtree = await postJson(SUBTREE_URL, {
        ott_id: match.ottId,
        format: "arguson",
        height_limit: cladeRequest.heightLimit,
      });
    } catch (error) {
      console.warn(`Skipping subtree for ${cladeRequest.name}: ${error.message}`);
      continue;
    }

    const argusonRoot = subtree.arguson;
    const lineage = [...(cladeInfo.lineage ?? [])]
      .reverse()
      .filter((entry) => entry.name && entry.name !== "cellular organisms")
      .map((entry, index, all) => ({
        name: entry.name,
        attributes: makeNodeAttributes(
          entry.name,
          entry.rank,
          all[index - 1]?.name ?? null,
        ),
      }));

    const subtreeNodes = convertArgusonNode(argusonRoot, lineage.at(-1)?.name ?? null);
    const subtreeRoot = subtreeNodes[0];
    if (!subtreeRoot) {
      continue;
    }

    const subtreePath = [...lineage, subtreeRoot].map((entry) => ({
      name: entry.name,
      attributes: entry.attributes,
    }));

    insertPath(root, subtreePath);

    const insertedRoot = (() => {
      let current = root;
      for (let index = 1; index < subtreePath.length; index += 1) {
        current = current.children.find((child) => child.name === subtreePath[index].name);
      }
      return current;
    })();

    if (insertedRoot) {
      mergeNode(insertedRoot, subtreeRoot);
    }
  }

  sortTree(root);

  const outputPath = path.join(process.cwd(), "data", "tree-of-life.json");
  await writeFile(outputPath, `${JSON.stringify(root, null, 2)}\n`, "utf8");

  console.log(`Wrote expanded dataset to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
