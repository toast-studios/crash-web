import { Container, Graphics, isMobile, Sprite, Text } from "pixi.js";
import { app } from "../app";

interface TextInputOptions {
  placeholder?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  fontColor?: number;
  padding?: number;
  fontFamily?: string;
}

export class TextInput extends Container {
  private text: Text;
  private bg: Sprite;
  private cursorGraphics: Graphics;
  private htmlInput: HTMLInputElement;

  constructor(options: TextInputOptions = {}) {
    super();

    const {
      placeholder = "",
      width = 300,
      height = 40,
      fontSize = 18,
      fontColor = 0xffffff,
      padding = 10,
      fontFamily = "Inter",
    } = options;
    this.bg = Sprite.from("input-bg");
    this.bg.width = width;
    this.bg.height = height;
    this.addChild(this.bg);

    this.text = new Text({
      text: placeholder,
      style: {
        fontSize,
        fill: fontColor,
        fontFamily,
        fontWeight: "600",
        wordWrapWidth: width - padding * 2,
        wordWrap: true,
      },
    });

    this.text.x = padding;
    this.text.y = height / 2 - this.text.height / 2;
    this.height = height;
    this.addChild(this.text);

    this.cursorGraphics = new Graphics();
    this.cursorGraphics.rect(0, 0, 2, fontSize);
    this.cursorGraphics.fill({ color: fontColor });
    this.cursorGraphics.visible = false;
    this.addChild(this.cursorGraphics);

    this.interactive = true;

    this.htmlInput = document.createElement("input");
    this.htmlInput.type = "text";
    this.htmlInput.style.position = "absolute";
    this.htmlInput.style.top = "-1000px";
    this.htmlInput.style.left = "-1000px";
    this.htmlInput.style.opacity = "0";
    this.htmlInput.style.pointerEvents = "none";
    document.body.appendChild(this.htmlInput);

    this.on("pointerdown", this.onFocus.bind(this));
    app.stage.on("pointerup", this.onBlur.bind(this));

    this.htmlInput.addEventListener("input", this.onInputChange);
    window.addEventListener("keydown", this.onKeyDown);
  }

  private onFocus() {
    this.text.text = "";
    this.cursorGraphics.visible = true;
    this.updateCursorPosition();
    this.cursorGraphics.y = this.text.y;
    this.htmlInput.value = this.text.text;

    // Use setTimeout to delay focusing the htmlInput
    if (isMobile.any) {
      setTimeout(() => {
        this.htmlInput.focus();
      }, 50);
    } else {
      this.htmlInput.focus();
    }
  }

  private onBlur = () => {
    if (document.activeElement !== this.htmlInput) {
      this.blur();
    }
  };

  private onInputChange = () => {
    const newText = this.htmlInput.value;
    this.text.text = newText;
    this.updateCursorPosition();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      this.blur();
    } else {
      e.preventDefault();
      if (e.key === "Backspace") {
        this.text.text = this.text.text.slice(0, -1);
        this.htmlInput.value = this.text.text;
      } else if (e.key.length === 1) {
        this.text.text += e.key;
        this.htmlInput.value = this.text.text;
      }
      this.updateCursorPosition();
    }
  };

  private updateCursorPosition() {
    const cursorOffset = 5;
    this.cursorGraphics.x = this.text.x + this.text.width + cursorOffset;
  }

  private blur() {
    this.cursorGraphics.visible = false;
    this.htmlInput.blur();
  }

  public get value(): string {
    return this.text.text;
  }

  public set value(val: string) {
    this.text.text = val;
    this.htmlInput.value = val;
    this.updateCursorPosition();
  }

  public destroy() {
    super.destroy();
    document.body.removeChild(this.htmlInput);
    this.htmlInput.removeEventListener("input", this.onInputChange);
    window.removeEventListener("keydown", this.onKeyDown);
  }
}
