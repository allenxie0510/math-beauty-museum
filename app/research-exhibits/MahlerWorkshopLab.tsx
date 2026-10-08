"use client";
import MahlerPolarLab from "./MahlerPolarLab";
import { ResearchModal } from "./ResearchLab";
export default function MahlerWorkshopLab({ close }: { close: () => void }) {
  return <ResearchModal title="Mahler 凸体对偶互动实验" close={close}><MahlerPolarLab onBack={close} /></ResearchModal>;
}
