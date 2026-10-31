// True with a mouse or trackpad. A form autofocuses its first field only then:
// on a touch screen the focus would push the keyboard up unasked.
export const finePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
