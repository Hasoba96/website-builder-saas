exports.up = (pgm) => {
  pgm.createSchema('application');
};

exports.down = (pgm) => {
  // RESTRICT is intentional: never silently remove later domain objects.
  pgm.dropSchema('application');
};
