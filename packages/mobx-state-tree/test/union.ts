import { types, hasParent, tryResolve, getSnapshot } from "../src"
const createTestFactories = () => {
    const Box = types.model("Box", {
        width: types.number,
        height: types.number
    })
    const Square = types.model("Square", {
        width: types.number
    })
    const Cube = types.model("Cube", {
        width: types.number,
        height: types.number,
        depth: types.number
    })
    const Plane = types.union(Square, Box)
    const Heighed = types.union(Box, Cube)
    const DispatchPlane = types.union(
        snapshot => (snapshot && "height" in snapshot ? Box : Square),
        Box,
        Square
    )
    const Block = types.model("Block", {
        list: types.array(Heighed)
    })
    return { Box, Square, Cube, Plane, DispatchPlane, Heighed, Block }
}
const createLiteralTestFactories = () => {
    const Man = types.model("Man", { type: types.literal("M") })
    const Woman = types.model("Woman", { type: types.literal("W") })
    const All = types.model("All", { type: types.identifier(types.string) })
    const ManWomanOrAll = types.union(Man, Woman, All)
    return { Man, Woman, All, ManWomanOrAll }
}
if (process.env.NODE_ENV !== "production") {
    test("it should complain about multiple applicable types no dispatch method", () => {
        const { Box, Square } = createTestFactories()
        const PlaneNotEager = types.union(Square, Box, {
            eager: false
        })
        expect(() => {
            PlaneNotEager.create({ width: 2, height: 2 })
        }).toThrow(/Error while converting/)
    })
}
test("it should have parent whenever creating or applying from a complex data structure to a model which has Union typed children", () => {
    const { Block, Heighed } = createTestFactories()
    const block = Block.create({
        list: [{ width: 2, height: 2 }]
    })
    const child = tryResolve(block, "./list/0")
    expect(hasParent(child)).toBe(true)
})
if (process.env.NODE_ENV !== "production") {
    test("it should complain about no applicable types", () => {
        const { Heighed } = createTestFactories()
        expect(() => {
            Heighed.create({ height: 2 })
        }).toThrow(/Error while converting/)
    })
}
test("it should be smart enough to discriminate by keys", () => {
    const { Box, Plane, Square } = createTestFactories()
    const doc = types.union(Square, Box).create({ width: 2 })
    expect(Box.is(doc)).toEqual(false)
    expect(Square.is(doc)).toEqual(true)
})
test("it should discriminate by value type", () => {
    const Size = types.model("Size", {
        width: 0,
        height: 0
    })
    const Picture = types.model("Picture", {
        url: "",
        size: Size
    })
    const Square = types.model("Square", {
        size: 0
    })
    const PictureOrSquare = types.union(Picture, Square)
    const doc = PictureOrSquare.create({ size: { width: 0, height: 0 } })
    expect(Picture.is(doc)).toEqual(true)
    expect(Square.is(doc)).toEqual(false)
})
test("it should compute exact union types", () => {
    const { Box, Plane, Square } = createTestFactories()
    expect(Plane.is(Box.create({ width: 3, height: 2 }))).toEqual(true)
    expect(Plane.is(Square.create({ width: 3 }))).toEqual(true)
})
test("it should compute exact union types - 2", () => {
    const { Box, DispatchPlane, Square } = createTestFactories()
    expect(DispatchPlane.is(Box.create({ width: 3, height: 2 }))).toEqual(true)
    expect(
        DispatchPlane.is(
            Square.create({ width: 3, height: 2 } as any /* incorrect type, superfluous attr!*/)
        )
    ).toEqual(true)
})
test("it should use dispatch to discriminate", () => {
    const { Box, DispatchPlane, Square } = createTestFactories()
    const a = DispatchPlane.create({ width: 3 })
    expect(getSnapshot(a)).toEqual({ width: 3 })
})
test("it should eagerly match by ambiguos value", () => {
    const { ManWomanOrAll, All, Man } = createLiteralTestFactories()
    const person = ManWomanOrAll.create({ type: "Z" })
    expect(All.is(person)).toEqual(true)
    expect(Man.is(person)).toEqual(false)
})
test("it should eagerly match by value literal", () => {
    const { ManWomanOrAll, All, Man } = createLiteralTestFactories()
    const person = ManWomanOrAll.create({ type: "M" })
    expect(All.is(person)).toEqual(false)
    expect(Man.is(person)).toEqual(true)
})
