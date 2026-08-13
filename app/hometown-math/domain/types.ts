export type HometownConceptId =
  | "symmetry.axial"
  | "symmetry.rotational"
  | "fractal.self_similarity"
  | "pattern.repetition"
  | "geometry.arch"
  | "geometry.hexagon"
  | "spiral.phyllotaxis"
  | "wave.periodicity";

export type OverlayGeometry = {
  type: "axis" | "radial" | "nested" | "repeat" | "arch" | "hexgrid" | "spiral" | "wave";
  points?: Array<[number, number]>;
  center?: [number, number];
  radius?: number;
  spacing?: number;
  rotation?: number;
};

export type MathLearningContent = {
  observation: string;
  measurementLabel: string;
  measurementValue: string;
  measurementDetail: string;
  formula: string;
  formulaMeaning: string;
  variables: Array<{ symbol: string; meaning: string }>;
  reasoning: string[];
  whyItMatters: string;
  applications: string[];
  explorePrompt: string;
  precision: "approximate" | "measured" | "teacher-confirmed";
};

export type ConceptCandidate = {
  conceptId: HometownConceptId;
  labelZh: string;
  confidence: number;
  evidence: string;
  overlay: OverlayGeometry;
  interactiveDemoId: string;
};

export type HometownManifestExhibit = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  conceptId: HometownConceptId;
  conceptLabel: string;
  interpretation: string;
  evidence: string;
  learning: MathLearningContent;
  interactiveDemoId: string;
  overlay: OverlayGeometry;
  imageWidth?: number;
  imageHeight?: number;
  zoneId: string;
  order: number;
  discoverer?: string;
};

export type HometownManifestZone = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  anchor: [number, number, number];
  exhibits: HometownManifestExhibit[];
};

export type HometownSceneManifest = {
  id: string;
  version: number;
  slug: string;
  title: string;
  subtitle: string;
  schoolClass?: string;
  locationLabel?: string;
  theme: "warm-rural-night";
  zones: HometownManifestZone[];
  tourPath: string[];
  environment: {
    sky: string;
    floor: string;
    light: string;
  };
};

export type TeacherExhibitDraft = {
  id: string;
  assetId: string;
  imageUrl: string;
  thumbnailUrl: string;
  imageWidth: number;
  imageHeight: number;
  filename: string;
  status: "UPLOADED" | "ANALYSIS_PENDING" | "ANALYZING" | "REVIEW_REQUIRED" | "APPROVED" | "REJECTED";
  zoneId: string;
  order: number;
  title: string;
  interpretation: string;
  evidence: string;
  learning: MathLearningContent;
  conceptId: HometownConceptId | null;
  overlay: OverlayGeometry | null;
  candidates: ConceptCandidate[];
  teacherConfirmed: boolean;
};

export type TeacherExhibitionDraft = {
  id: string;
  slug: string;
  title: string;
  schoolClass: string;
  locationLabel: string;
  visibility: "unpublished" | "link-only";
  manifestVersion: number;
  zones: Array<{ id: string; name: string; subtitle: string; order: number }>;
  exhibits: TeacherExhibitDraft[];
};
