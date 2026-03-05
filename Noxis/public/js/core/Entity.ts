export abstract class Entity {
    protected x: number;
    protected y: number;
    protected facing: string = 's';
    protected moving: boolean = false;
    protected animMs: number = 0;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    abstract render(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }, ...args: any[]): void;

    updatePosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    setFacing(facing: string) {
        this.facing = facing;
    }

    setMoving(moving: boolean) {
        this.moving = moving;
    }

    setAnimMs(animMs: number) {
        this.animMs = animMs;
    }
}