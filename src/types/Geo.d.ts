export declare type Point = [number, number];
export declare type Path = Array<Point>;
export declare type Polygon = Array<Path>;
export declare type Circle = [Point, number];
export declare type SingleGeo = {
    type: 'point';
    coordinate: Point;
} | {
    type: 'path';
    coordinate: Path;
} | {
    type: 'polygon';
    coordinate: Polygon;
} | {
    type: 'circle';
    coordinate: Circle;
};
export declare type Geo = SingleGeo | SingleGeo[];
