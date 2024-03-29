export class SetEqual<T> {
  private s: Set<string>
  constructor(elements: Iterable<T> = []) {
    this.s = new Set()
    for(const element of elements) {
      this.add(element)
    }
  }

  public has(element: T) {
    return this.s.has(JSON.stringify(element))
  }

  public add(element: T) {
    this.s.add(JSON.stringify(element))
  }

  public size() {
    return this.s.size
  }

  public [Symbol.iterator]() {
    return this.elements()
  }

  public* elements() {
    for (const str of this.s) {
      yield JSON.parse(str)
    }
  }

  public isSubset(that: SetEqual<T>) {
    for (const element of this) {
      if (!that.has(element)) {
        return false
      }
    }
    return true
  }

  public subtract(that: SetEqual<T>): SetEqual<T> {
    const difference = new SetEqual<T>()
    for (const element of this) {
      if (!that.has(element)) {
        difference.add(element)
      }
    }
    return difference
  }

  public intersect(that: SetEqual<T>): SetEqual<T> {
    const intersection = new SetEqual<T>()
    for (const element of this) {
      if (that.has(element)) {
        intersection.add(element)
      }
    }
    return intersection
  }
}

export function equal(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b)
}