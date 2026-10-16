// PWA·홈 화면 아이콘 생성: node scripts/make-icons.mjs
// 살구색 배경 위에 어제(회색)·오늘(주황) 막대 한 쌍.
import { mkdir, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const HERO = "#f6d3a6";
const YESTERDAY = "#c9ccd3";
const TODAY = "#d4712f";

function icon(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.2 : size * 0.12; // maskable 은 안전 영역(80%) 안에 그린다
  const inner = size - pad * 2;
  const barW = inner * 0.2;
  const gap = inner * 0.06;
  return h(
    "div",
    {
      style: {
        width: size,
        height: size,
        background: HERO,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap,
        paddingBottom: pad + inner * 0.12,
        borderRadius: maskable ? 0 : size * 0.22,
      },
    },
    h("div", { style: { width: barW, height: inner * 0.45, background: YESTERDAY, borderRadius: `${barW * 0.35}px ${barW * 0.35}px 0 0` } }),
    h("div", { style: { width: barW, height: inner * 0.7, background: TODAY, borderRadius: `${barW * 0.35}px ${barW * 0.35}px 0 0` } }),
  );
}

async function save(path, element, size) {
  const res = new ImageResponse(element, { width: size, height: size });
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  console.log("wrote", path);
}

await mkdir("public/icons", { recursive: true });
await save("public/icons/icon-192.png", icon(192), 192);
await save("public/icons/icon-512.png", icon(512), 512);
await save("public/icons/icon-512-maskable.png", icon(512, { maskable: true }), 512);
await save("app/apple-icon.png", icon(180, { maskable: true }), 180);
await save("app/icon.png", icon(64), 64);
