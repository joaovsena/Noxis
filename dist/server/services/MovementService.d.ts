import { MoveMessage, PlayerRuntime } from '../models/types';
import { MapService } from './MapService';
type GetEffectAggregateFn = (player: PlayerRuntime, now: number) => {
    moveMul?: number;
};
export declare class MovementService {
    private readonly mapService;
    private readonly getActiveSkillEffectAggregate;
    constructor(mapService: MapService, getActiveSkillEffectAggregate: GetEffectAggregateFn);
    handleMove(player: PlayerRuntime, msg: MoveMessage): void;
    movePlayerTowardTarget(player: PlayerRuntime, deltaSeconds: number, now: number): void;
    assignPathTo(player: PlayerRuntime, destinationX: number, destinationY: number): void;
    recalculatePathToward(player: PlayerRuntime, destinationX: number, destinationY: number, now: number): void;
    private advancePathAfterNode;
    private getIsoMoveStepMultiplier;
    private isDungeonMap;
    private getPathfindBudgetMs;
    private getPathfindMaxIters;
    private getNearbyGoalCandidateLimit;
    private findPathWithNearbyGoals;
    private smoothWorldPath;
    private worldToPathCell;
    private pathCellToWorld;
    private isPathCellWalkable;
    private findPath;
    private isPathBlockedAt;
    private isPathSegmentBlocked;
    private findNearestWalkableCell;
    private pathHeuristic;
    private rebuildPath;
}
export {};
//# sourceMappingURL=MovementService.d.ts.map