type CollisionSampler = {
    isBlockedAt: (worldX: number, worldY: number, radiusWorld: number) => boolean;
};
export declare function getMapTiledCollisionSampler(mapKey: string): CollisionSampler | null;
export {};
//# sourceMappingURL=tiledCollision.d.ts.map