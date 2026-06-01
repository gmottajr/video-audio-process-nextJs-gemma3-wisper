import type { LandingSectionStrategy } from "../../types";
import { HeroSection } from "../../components/HeroSection";
import { ForgeSection } from "../../components/ForgeSection";
import { StatsSection } from "../../components/StatsSection";
import { ProTipSection } from "../../components/ProTipSection";
import { MusicSection } from "../../components/MusicSection";
import { FooterSection } from "../../components/FooterSection";

export const landingSectionRegistry: LandingSectionStrategy[] = [
  { id: "hero",    key: "hero",    Component: HeroSection },
  { id: "forge",   key: "forge",   Component: ForgeSection },
  { id: "stats",   key: "stats",   Component: StatsSection },
  { id: "proTip",  key: "protip",  Component: ProTipSection },
  { id: "music",   key: "music",   Component: MusicSection },
  { id: "footer",  key: "footer",  Component: FooterSection },
];
