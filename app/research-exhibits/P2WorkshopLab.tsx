"use client";
import TorusIsoperimetricLab from "./TorusIsoperimetricLab";
import GaussianMoatLab from "./GaussianMoatLab";
import { ResearchModal } from "./ResearchLab";
export default function P2WorkshopLab({ kind, close }: { kind: "torus" | "gaussian"; close: () => void }) {
  return <ResearchModal title={kind === "torus" ? "三维环面等周形态互动实验" : "高斯素数护城河互动实验"} close={close}>{kind === "torus" ? <TorusIsoperimetricLab onBack={close} /> : <GaussianMoatLab onBack={close} />}</ResearchModal>;
}
