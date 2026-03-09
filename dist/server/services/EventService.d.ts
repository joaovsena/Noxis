type BroadcastMapFn = (mapKey: string, mapId: string, payload: any) => void;
type ProjectToWalkableFn = (mapKey: string, x: number, y: number) => {
    x: number;
    y: number;
};
export declare class EventService {
    private readonly mobService;
    private readonly broadcastMapInstance;
    private readonly projectToWalkable;
    private readonly activeByInstance;
    private readonly nextStartByEvent;
    constructor(mobService: any, broadcastMapInstance: BroadcastMapFn, projectToWalkable: ProjectToWalkableFn);
    tick(now: number): void;
    getActiveEventsForMap(mapKey: string, mapId: string): {
        id: string;
        name: string;
        mapKey: string;
        mapId: string;
        startedAt: number;
        endsAt: number;
    }[];
    private syncActiveState;
    private startEvent;
    private finishEvent;
    private mapInstanceId;
}
export {};
//# sourceMappingURL=EventService.d.ts.map