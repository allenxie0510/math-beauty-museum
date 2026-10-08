"use client";
import VoronoiPercolationLab from "./VoronoiPercolationLab";
import { ResearchModal } from "./ResearchLab";
export default function VoronoiWorkshopLab({ close }: { close: () => void }) {
  return <ResearchModal title="Voronoi 渗流互动实验" close={close}><VoronoiPercolationLab onBack={close} /></ResearchModal>;
}
