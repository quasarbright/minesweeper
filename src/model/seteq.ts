export class SetEq<T> {
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
}