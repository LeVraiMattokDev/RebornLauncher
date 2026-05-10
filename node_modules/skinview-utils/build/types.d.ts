/// <reference types="offscreencanvas" />
export declare type TextureCanvas = HTMLCanvasElement | OffscreenCanvas;
export declare type TextureSource = HTMLImageElement | HTMLVideoElement | ImageBitmap | TextureCanvas;
export declare type ModelType = "default" | "slim";
export declare function isTextureSource(value: unknown): value is TextureSource;
