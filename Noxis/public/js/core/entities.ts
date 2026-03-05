import { Entity } from './Entity';

export class SpriteEntity extends Entity {
    constructor(x: number, y: number, private spriteKey: string) {
        super(x, y);
    }

    render(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }, sprites: any) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        const frame = sprites.getFrame(this.spriteKey, this.facing, this.moving, this.animMs);
        if (frame) {
            ctx.drawImage(frame.image, screenX - 20, screenY - 20);
        }
    }
}

export class ShapeEntity extends Entity {
    constructor(x: number, y: number, private size: number, private color: string) {
        super(x, y);
    }

    render(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        ctx.fillStyle = this.color;
        ctx.fillRect(screenX - this.size / 2, screenY - this.size / 2, this.size, this.size);
    }
}