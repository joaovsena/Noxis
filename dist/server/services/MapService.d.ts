import { PlayerRuntime } from '../models/types';
export declare class MapService {
    getMapWorld(mapKey: string): {
        width: number;
        height: number;
    };
    getMapNavGrid(mapKey: string): {
        cols: number;
        rows: number;
        cellWidth: number;
        cellHeight: number;
    };
    mapInstanceId(mapKey: string, mapId: string): string;
    getAreaIdForPlayer(player: PlayerRuntime): string;
    getMapTiledCollisionSampler(mapKey: string): {
        isBlockedAt: (worldX: number, worldY: number, radiusWorld: number) => boolean;
    } | null;
    isBlockedAt(mapKey: string, x: number, y: number): boolean;
    projectToWalkable(mapKey: string, x: number, y: number): {
        x: number;
        y: number;
    };
    processPortalCollision(player: PlayerRuntime, now: number, onPortal?: (player: PlayerRuntime) => void, onDungeonPortal?: (player: PlayerRuntime, portalId: string, dungeonTemplateId: string) => void): void;
    private worldToPathCell;
    private pathCellToWorld;
    private isPathCellWalkable;
    private findNearestWalkableCell;
}
//# sourceMappingURL=MapService.d.ts.map