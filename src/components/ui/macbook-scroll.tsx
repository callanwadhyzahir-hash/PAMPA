"use client";

import { MotionValue, motion, useScroll, useTransform } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Command,
  FastForward,
  Globe,
  Mic,
  Moon,
  Search,
  SkipBack,
  SkipForward,
  Sun,
  SunDim,
  Table2,
  Volume,
  Volume1,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MacbookScroll({
  title,
  badge,
  showGradient = true,
  children,
}: {
  title?: ReactNode;
  badge?: ReactNode;
  showGradient?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const BASE_WIDTH_PX = 512; // 32rem lid width at the component's natural scale
  const [containerScale, setContainerScale] = useState(1);
  useEffect(() => {
    function updateScale() {
      const available = window.innerWidth;
      const next = Math.min(1, (available * 0.9) / BASE_WIDTH_PX);
      setContainerScale(Math.max(0.4, next));
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const scaleX = useTransform(scrollYProgress, [0, 0.3], [1.2, isMobile ? 1 : 1.5]);
  const scaleY = useTransform(scrollYProgress, [0, 0.3], [0.6, isMobile ? 1 : 1.5]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, 1500]);
  const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
  const textTransform = useTransform(scrollYProgress, [0, 0.3], [0, 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div
      ref={ref}
      style={{ transform: `scale(${containerScale})` }}
      className="flex min-h-[200vh] flex-shrink-0 flex-col items-center justify-start py-0 [perspective:800px] md:py-80"
    >
      <motion.h2
        style={{ translateY: textTransform, opacity: textOpacity }}
        className="mb-20 text-center text-heading font-medium text-phosphor-white"
      >
        {title}
      </motion.h2>

      <Lid scaleX={scaleX} scaleY={scaleY} rotate={rotate} translate={translate}>
        {children}
      </Lid>

      <div className="relative -z-10 h-[22rem] w-[32rem] overflow-hidden rounded-2xl bg-ground-iron">
        <div className="relative h-10 w-full">
          <div className="absolute inset-x-0 mx-auto h-4 w-[80%] bg-void-black" />
        </div>
        <div className="relative flex">
          <div className="mx-auto h-full w-[10%] overflow-hidden">
            <SpeakerGrid />
          </div>
          <div className="mx-auto h-full w-[80%]">
            <Keypad />
          </div>
          <div className="mx-auto h-full w-[10%] overflow-hidden">
            <SpeakerGrid />
          </div>
        </div>
        <Trackpad />
        <div className="absolute inset-x-0 bottom-0 mx-auto h-2 w-20 rounded-tl-3xl rounded-tr-3xl bg-gradient-to-t from-void-black to-carbon-veil" />
        {showGradient && (
          <div className="absolute inset-x-0 bottom-0 z-50 h-40 bg-gradient-to-t from-ground-iron via-ground-iron to-transparent" />
        )}
        {badge && <div className="absolute bottom-4 left-4">{badge}</div>}
      </div>
    </div>
  );
}

function Lid({
  scaleX,
  scaleY,
  rotate,
  translate,
  children,
}: {
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  rotate: MotionValue<number>;
  translate: MotionValue<number>;
  children?: ReactNode;
}) {
  return (
    <div className="relative [perspective:800px]">
      <div
        style={{ transform: "perspective(800px) rotateX(-25deg) translateZ(0px)", transformOrigin: "bottom", transformStyle: "preserve-3d" }}
        className="relative h-[12rem] w-[32rem] rounded-2xl bg-void-black p-2"
      >
        <div
          style={{ boxShadow: "0px 2px 0px 2px var(--carbon-veil) inset" }}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-void-black"
        >
          <span className="size-1.5 rounded-full bg-lime-pulse" aria-hidden="true" />
        </div>
      </div>
      <motion.div
        style={{
          scaleX,
          scaleY,
          rotateX: rotate,
          translateY: translate,
          transformStyle: "preserve-3d",
          transformOrigin: "top",
        }}
        className="absolute inset-0 h-96 w-[32rem] rounded-2xl bg-void-black p-2"
      >
        <div className="absolute inset-0 overflow-hidden rounded-lg bg-carbon-veil">{children}</div>
      </motion.div>
    </div>
  );
}

function Trackpad() {
  return <div className="mx-auto my-1 h-32 w-[40%] rounded-xl" style={{ boxShadow: "0px 0px 1px 1px #00000020 inset" }} />;
}

function Keypad() {
  return (
    <div className="mx-1 h-full rounded-md bg-void-black p-1">
      <Row>
        <KBtn className="w-10 items-end justify-start pl-[4px] pb-[2px]" childrenClassName="items-start">esc</KBtn>
        <KBtn><SunDim className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F1</span></KBtn>
        <KBtn><Sun className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F2</span></KBtn>
        <KBtn><Table2 className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F3</span></KBtn>
        <KBtn><Search className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F4</span></KBtn>
        <KBtn><Mic className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F5</span></KBtn>
        <KBtn><Moon className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F6</span></KBtn>
        <KBtn><SkipBack className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F7</span></KBtn>
        <KBtn><FastForward className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F8</span></KBtn>
        <KBtn><SkipForward className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F9</span></KBtn>
        <KBtn><VolumeX className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F10</span></KBtn>
        <KBtn><Volume1 className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F11</span></KBtn>
        <KBtn><Volume className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F12</span></KBtn>
        <KBtn>
          <div className="h-4 w-4 rounded-full bg-gradient-to-b from-carbon-veil from-20% via-void-black via-50% to-carbon-veil to-95% p-px">
            <div className="h-full w-full rounded-full bg-void-black" />
          </div>
        </KBtn>
      </Row>

      <Row>
        <KBtn><span className="block">~</span><span className="mt-1 block">`</span></KBtn>
        <KBtn><span className="block">!</span><span className="block">1</span></KBtn>
        <KBtn><span className="block">@</span><span className="block">2</span></KBtn>
        <KBtn><span className="block">#</span><span className="block">3</span></KBtn>
        <KBtn><span className="block">$</span><span className="block">4</span></KBtn>
        <KBtn><span className="block">%</span><span className="block">5</span></KBtn>
        <KBtn><span className="block">^</span><span className="block">6</span></KBtn>
        <KBtn><span className="block">&amp;</span><span className="block">7</span></KBtn>
        <KBtn><span className="block">*</span><span className="block">8</span></KBtn>
        <KBtn><span className="block">(</span><span className="block">9</span></KBtn>
        <KBtn><span className="block">)</span><span className="block">0</span></KBtn>
        <KBtn><span className="block">&mdash;</span><span className="block">_</span></KBtn>
        <KBtn><span className="block">+</span><span className="block"> = </span></KBtn>
        <KBtn className="w-10 items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">delete</KBtn>
      </Row>

      <Row>
        <KBtn className="w-10 items-end justify-start pl-[4px] pb-[2px]" childrenClassName="items-start">tab</KBtn>
        {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((k) => <KBtn key={k}><span className="block">{k}</span></KBtn>)}
        <KBtn><span className="block">{`{`}</span><span className="block">{`[`}</span></KBtn>
        <KBtn><span className="block">{`}`}</span><span className="block">{`]`}</span></KBtn>
        <KBtn><span className="block">{`|`}</span><span className="block">{`\\`}</span></KBtn>
      </Row>

      <Row>
        <KBtn className="w-[2.8rem] items-end justify-start pl-[4px] pb-[2px]" childrenClassName="items-start">caps lock</KBtn>
        {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((k) => <KBtn key={k}><span className="block">{k}</span></KBtn>)}
        <KBtn><span className="block">{`:`}</span><span className="block">{`;`}</span></KBtn>
        <KBtn><span className="block">{`"`}</span><span className="block">{`'`}</span></KBtn>
        <KBtn className="w-[2.85rem] items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">return</KBtn>
      </Row>

      <Row>
        <KBtn className="w-[3.65rem] items-end justify-start pl-[4px] pb-[2px]" childrenClassName="items-start">shift</KBtn>
        {["Z", "X", "C", "V", "B", "N", "M"].map((k) => <KBtn key={k}><span className="block">{k}</span></KBtn>)}
        <KBtn><span className="block">{`<`}</span><span className="block">{`,`}</span></KBtn>
        <KBtn><span className="block">{`>`}</span><span className="block">{`.`}</span></KBtn>
        <KBtn><span className="block">{`?`}</span><span className="block">{`/`}</span></KBtn>
        <KBtn className="w-[3.65rem] items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">shift</KBtn>
      </Row>

      <Row>
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1"><span className="block">fn</span></div>
          <div className="flex w-full justify-start pl-1"><Globe className="h-[6px] w-[6px]" /></div>
        </KBtn>
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1"><ChevronUp className="h-[6px] w-[6px]" /></div>
          <div className="flex w-full justify-start pl-1"><span className="block">control</span></div>
        </KBtn>
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1"><OptionKey className="h-[6px] w-[6px]" /></div>
          <div className="flex w-full justify-start pl-1"><span className="block">option</span></div>
        </KBtn>
        <KBtn className="w-8" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-end pr-1"><Command className="h-[6px] w-[6px]" /></div>
          <div className="flex w-full justify-start pl-1"><span className="block">command</span></div>
        </KBtn>
        <KBtn className="w-[8.2rem]" />
        <KBtn className="w-8" childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-start pl-1"><Command className="h-[6px] w-[6px]" /></div>
          <div className="flex w-full justify-start pl-1"><span className="block">command</span></div>
        </KBtn>
        <KBtn childrenClassName="h-full justify-between py-[4px]">
          <div className="flex w-full justify-start pl-1"><OptionKey className="h-[6px] w-[6px]" /></div>
          <div className="flex w-full justify-start pl-1"><span className="block">option</span></div>
        </KBtn>
        <div className="mt-[2px] flex h-6 w-[4.9rem] flex-col items-center justify-end rounded-[4px] p-[0.5px]">
          <KBtn className="h-3 w-6"><ChevronUp className="h-[6px] w-[6px]" /></KBtn>
          <div className="flex">
            <KBtn className="h-3 w-6"><ChevronLeft className="h-[6px] w-[6px]" /></KBtn>
            <KBtn className="h-3 w-6"><ChevronDown className="h-[6px] w-[6px]" /></KBtn>
            <KBtn className="h-3 w-6"><ChevronRight className="h-[6px] w-[6px]" /></KBtn>
          </div>
        </div>
      </Row>
    </div>
  );
}

function KBtn({
  className,
  children,
  childrenClassName,
  backlit = true,
}: {
  className?: string;
  children?: ReactNode;
  childrenClassName?: string;
  backlit?: boolean;
}) {
  return (
    <div className={cn("rounded-[4px] p-[0.5px]", backlit && "bg-lime-pulse/10 shadow-lg shadow-lime-pulse/10")}>
      <div
        className={cn("flex h-6 w-6 items-center justify-center rounded-[3.5px] bg-void-black", className)}
        style={{ boxShadow: "0px -0.5px 2px 0 #000 inset, -0.5px 0px 2px 0 #000 inset" }}
      >
        <div className={cn("flex w-full flex-col items-center justify-center text-[5px] text-sage-60", childrenClassName, backlit && "text-phosphor-white")}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mb-[2px] flex w-full flex-shrink-0 gap-[2px]">{children}</div>;
}

function SpeakerGrid() {
  return (
    <div
      className="mt-2 flex h-40 gap-[2px] px-[0.5px]"
      style={{ backgroundImage: "radial-gradient(circle, var(--circuit-border) 0.5px, transparent 0.5px)", backgroundSize: "3px 3px" }}
    />
  );
}

function OptionKey({ className }: { className: string }) {
  return (
    <svg fill="none" viewBox="0 0 32 32" className={className}>
      <rect stroke="currentColor" strokeWidth={2} x="18" y="5" width="10" height="2" />
      <polygon stroke="currentColor" strokeWidth={2} points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25" />
    </svg>
  );
}
