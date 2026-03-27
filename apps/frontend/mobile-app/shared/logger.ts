export function disableConsoleInProduction() {
  if (__DEV__) {
    return;
  }

  const noop = () => undefined;

  console.log = noop;
  console.info = noop;
  console.debug = noop;
}
