import gsap from "gsap";
import { Assets, Container, Sprite, Graphics } from "pixi.js";
import { Logger } from "../utils/logger";
import { app } from "../app";

export class ImageSlider extends Container {
  private settings: {
    width: number;
    height: number;
    autoPlay: boolean;
    transitionTime: number;
    paddingX: number;
    delay: number;
  };
  private images: string[];
  private currentIndex: number;
  private slides: Container[];
  private interval: NodeJS.Timeout | null = null;

  constructor(options: {
    images: string[];
    settings?: Partial<ImageSlider["settings"]>;
  }) {
    super();
    // Merge default options with user-provided ones
    const defaultOptions = {
      width: app.screen.width,
      height: 150,
      autoPlay: true,
      transitionTime: 1, // GSAP transition duration
      paddingX: 50,
      delay: 3, // Time between transitions
    };

    this.settings = { ...defaultOptions, ...options.settings };
    this.images = options.images;
    this.width = this.settings.width;
    this.height = this.settings.height;
    this.currentIndex = 0;

    // Append the canvas to the specified container
    // Load the images
    this.slides = [];
    this.loadImages();
    this.y = 100;
  }

  loadImages() {
    const images = this.images.map((imageUrl) => {
      return Assets.load(imageUrl);
    });
    Promise.all(images)
      .then((textures) => {
        textures.forEach((texture) => {
          //   Create a mask to hide overflow
          const imageContainer = new Container();
          imageContainer.width = this.settings.width;

          const mask = new Graphics();
          mask.roundRect(
            0,
            0,
            this.settings.width - this.settings.paddingX,
            this.settings.height,
            10,
          );
          mask.fill({ color: 0xffffff, alpha: 1 });

          const image = new Sprite(texture);
          const aspectRatio = texture.height / texture.width;
          image.width = this.settings.width - this.settings.paddingX;
          image.height = image.width * aspectRatio;

          // Center the image vertically within the mask
          image.y = (this.settings.height - image.height) / 2;

          image.mask = mask;
          image.x = (this.settings.width - image.width) / 2;
          mask.x = (this.settings.width - image.width) / 2;

          imageContainer.addChild(image, mask);
          this.slides.push(imageContainer);
        });
      })
      .then(() => {
        this.setupSlides();
        if (this.settings.autoPlay && this.slides.length > 1) {
          this.start();
        }
      })
      .catch((error) => {
        Logger.error("Error loading images:", error);
      });
  }

  setupSlides() {
    // Create sprites for each image and position them
    this.slides.forEach((slide, index) => {
      const xPosition = index * app.screen.width;
      slide.x = xPosition;
      this.addChild(slide);
    });
  }

  start() {
    this.interval = setInterval(
      () => this.nextSlide(),
      this.settings.delay * 1000,
    );
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  nextSlide() {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;

    // Animate out the current slide
    gsap.to(this.slides[this.currentIndex], {
      duration: this.settings.transitionTime,
      alpha: 0,
      x: -this.settings.width,
      ease: "power2.inOut",
    });

    // Animate in the next slide
    gsap.fromTo(
      this.slides[nextIndex],
      { x: this.settings.width, alpha: 0 },
      {
        duration: this.settings.transitionTime,
        x: 0,
        alpha: 1,
        ease: "power2.inOut",
      },
    );

    this.currentIndex = nextIndex;
  }

  prevSlide() {
    const prevIndex =
      (this.currentIndex - 1 + this.slides.length) % this.slides.length;

    // Animate out the current slide
    gsap.to(this.slides[this.currentIndex], {
      duration: this.settings.transitionTime,
      alpha: 0,
      x: this.settings.width,
      ease: "power2.inOut",
    });

    // Animate in the previous slide
    gsap.fromTo(
      this.slides[prevIndex],
      { x: -this.settings.width, alpha: 0 },
      {
        duration: this.settings.transitionTime,
        x: 0,
        alpha: 1,
        ease: "power2.inOut",
      },
    );

    this.currentIndex = prevIndex;
  }

  // Handle resize events
  resize(newWidth: number, newHeight: number) {
    this.width = newWidth;
    this.height = newHeight;

    this.slides.forEach((slide) => {
      slide.x = this.width / 2;
      slide.y = this.height / 2;
    });
  }
}
