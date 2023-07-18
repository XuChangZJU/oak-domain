export type Point = [number, number];
export type Path = Array<Point>;
export type Polygon = Array<Path>;
export type Circle = [Point, number];
export type SingleGeo = {
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
export type Geo = SingleGeo | SingleGeo[];
