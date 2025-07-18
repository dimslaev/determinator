export namespace Logger {
  export const error = (msg: string, ...args: any[]) =>
    console.error(msg, ...args);
  export const warn = (msg: string, ...args: any[]) =>
    console.warn(msg, ...args);
  export const info = (msg: string, ...args: any[]) => {
    console.info(msg, ...args);
  };
  export const debug = (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(msg, ...args);
    }
  };
}
