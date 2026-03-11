export type MapMetadata = {
    mapKey: string;
    assetKey: string;
    mapCode: string;
    tmjPath: string;
    tmjUrl: string;
    tilesBaseUrl: string;
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    orientation: string;
    worldTileSize: number;
    worldScale: number;
    world: {
        width: number;
        height: number;
    };
};
export declare function getMapMetadata(mapKey: string): MapMetadata | null;
//# sourceMappingURL=mapMetadata.d.ts.map