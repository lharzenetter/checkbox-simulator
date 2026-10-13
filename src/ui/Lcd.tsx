import { useEffect, useRef } from "react";
import type { State } from "../core/index";
import {
  LCD_HEIGHT,
  LCD_WIDTH,
  paintFramebuffer,
  renderScreen,
  screenModel,
  screenText,
} from "../lcd/index";
import styles from "./Lcd.module.css";

const SCALE = 3;

export function Lcd({ state }: { state: State }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintedRef = useRef<string>(null);
  const model = screenModel(state);
  const text = screenText(model);

  // Every tick yields a new model; repaint only when what the LCD shows has changed.
  useEffect(() => {
    const modelKey = JSON.stringify(model);
    const context = canvasRef.current?.getContext("2d");
    if (context && paintedRef.current !== modelKey) {
      paintFramebuffer(context, renderScreen(model));
      paintedRef.current = modelKey;
    }
  });

  return (
    <canvas
      ref={canvasRef}
      className={styles.lcd}
      width={LCD_WIDTH * SCALE}
      height={LCD_HEIGHT * SCALE}
      role="img"
      aria-label={text.length === 0 ? "Display aus" : text.join("\n")}
    />
  );
}
