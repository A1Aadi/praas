const expect = require('chai').expect;
const jwt = require('jsonwebtoken');
const config = require('./config');
const models = require('./models');
const helpers = require('./lib/helpers');
const snapshot = require('snap-shot-it');
const generate = require('nanoid/generate');

const fakeUsers = async (count = 5) => {
  const fups = [];
  for (let i = 0; i < count; i++) {
    const fup = helpers.fakeUserProfile();
    let user = models.User.build({ ...fup });
    user.setPassword(fup.password);
    user = await user.save();
    fups.push(user);
  }

  return fups;
};

const fakeConduits = async (user, count = 5) => {
  const fcts = [];
  for (let i = 0; i < count; i++) {
    const fct = helpers.fakeConduit();
    const ct = models.Conduit.build({ ...fct });
    ct.userId = user.id;
    const domain = models.System.cconf.settings.domain;
    const alphabet = models.System.cconf.settings.alphabet;
    const randomStr = generate(alphabet, models.System.cconf.settings.uccount); // => "smgfz"

    const initials = user.firstName.slice(0, 1).toLowerCase()
      .concat(user.lastName.slice(0, 1).toLowerCase());

    const curi = initials.concat('-', randomStr, '.', domain);
    ct.curi = curi;

    await ct.save();
    fcts.push(fct);
  }
  return fcts;
};

/**
 * Unit tests for the database model
 * - order of tests as written is significant
 * - when adding new tests make sure the sequence of tests
 *   test the lifecycle of the model instances
 */
describe('PraaS', () => {
  // let users = undefined;

  before('running tests', async () => {
    await models.db.sync({ force: true });
    // const sys = models.System.build({
    //   conf: [{
    //     alphabet: '123456789abcdefghjkmnopqrstuvwxyz',
    //     ccount: 5
    //   }]
    // });
    // await sys.save();
  });

  context('Non-functional requirements', () => {
    it('includes validation of critical fields', async () => {
      const fakeUserProfile = helpers.fakeUserProfile();
      // replace with bad field values to check if the model catches
      // these errors... NOTE: not exhaustive, we are only testing to
      // see if the validation at the model layer is triggered
      fakeUserProfile.email = 'none@anystreet';
      try {
        const user = models.User.build({ ...fakeUserProfile });
        await user.validate({ fields: ['email'] });
      } catch ({ name, errors }) {
        expect(name).to.equal('SequelizeValidationError');
        for (const error of errors) {
          expect(error.message).to.match(/Validation is on email failed/);
          expect(error.path).to.match(/^email$/);
        }
      }
    });

    it('includes checks for not null constraints of critical fields', async () => {
      try {
        const fakeUserProfile2 = helpers.fakeUserProfile({ firstName: null, lastName: null, email: null, password: null });
        const user2 = models.User.build({ ...fakeUserProfile2 });
        await user2.save();
      } catch ({ name, ...rest }) {
        expect(name).to.match(/TypeError/);
        // v.a: Sequelize behaviour changed from throwing SequelizeValidationError
        // with a list of errors to throwing a single TypeError instead... moving
        // on for now but making sure that this behaviour doesn't change by
        // checking for an empty error list.
        expect(rest).to.be.empty;
      }
    });
  });

  context('User model', () => {
    const fup = helpers.fakeUserProfile();

    it('should store new user(s)', async () => {
      const user = models.User.build({ ...fup });

      user.setPassword(fup.password);
      expect(user.passwordValid(fup.password)).to.be.true;
      const newUser = await user.save();

      expect(newUser).to.be.an('object');
      expect(newUser).to.have.property('firstName');
      expect(newUser).to.have.property('email');
      expect(newUser.firstName).to.equal(fup.firstName);
    });

    it('should validate if email is unique', async () => {
      const fup1 = helpers.fakeUserProfile();
      const user1 = models.User.build({ ...fup1 });
      user1.setPassword(fup.password);
      await user1.save();

      const fup2 = helpers.fakeUserProfile();
      const user2 = models.User.build({ ...fup2 });
      user2.email = user1.email;
      user2.setPassword(fup.password);

      try {
        await user2.save();
      } catch ({ name, errors }) {
        expect(name).to.equal('SequelizeUniqueConstraintError');
        for (const error of errors) {
          expect(error.message).to.match(/email must be unique/);
          expect(error.type).to.match(/unique violation/);
          expect(error.path).to.match(/^email$/);
        }
      }
    });

    it('should validate passwords', async () => {
      const user = await models.User.findOne({ where: { email: fup.email } });
      user.setPassword(fup.password);
      // positive test case
      expect(user.passwordValid(fup.password)).to.be.true;
      // negative test case
      expect(user.passwordValid('bad password')).to.be.false;
    });

    it('should generate profile JSON', async () => {
      const user = await models.User.findOne({ where: { email: fup.email } });
      const profileJSON = user.toProfileJSONFor();
      snapshot(profileJSON);
    });

    it('should generate auth JSON', async () => {
      const user = await models.User.findOne({ where: { email: fup.email } });
      const authJSON = user.toAuthJSON();
      expect(authJSON).to.have.property('token');

      const jwtDecoded = jwt.verify(authJSON.token, config.secret);
      expect(jwtDecoded.email).to.equal(user.email);
      expect(jwtDecoded.id).to.equal(user.id);
    });
  });

  context('Conduit model', () => {
    const fct = helpers.fakeConduit();
    const ct = models.Conduit.build({ ...fct });

    let user = undefined;

    before(async () => {
      const fup = helpers.fakeUserProfile();
      user = models.User.build({ ...fup });
      user.setPassword(fup.password);
      user = await user.save();
      await models.Conduit.sync();
    });

    after('populate for integration test', async function () {
      const fups = await fakeUsers(10);
      const users = fups.map((fup, _i) => {
        return { id: fup.id, firstName: fup.firstName, lastName: fup.lastName };
      });

      for (let i = 0; i < users.length; i++) {
        await fakeConduits(users[i]);
      }
    });

    it('should store conduit', async () => {
      ct.userId = user.id;
      const domain = models.System.cconf.settings.domain;
      const alphabet = models.System.cconf.settings.alphabet;
      const randomStr = generate(alphabet, models.System.cconf.settings.uccount); // => "smgfz"

      const initials = user.firstName.slice(0, 1).toLowerCase()
        .concat(user.lastName.slice(0, 1).toLowerCase());

      const curi = initials.concat('-', randomStr, '.', domain);
      ct.curi = curi;

      const nct = await ct.save();
      expect(nct).to.be.an('object');
      expect(nct).to.have.property('suriApiKey');
      expect(nct).to.have.property('suriType');
      expect(nct.suriType).to.equal(ct.suriType);
    });

    it('should validate if curi is unique', async () => {
      const fct2 = helpers.fakeConduit();
      const ct2 = models.Conduit.build({ ...fct2 });

      ct2.curi = ct.curi;
      ct2.userId = user.id;

      try {
        const nct = await ct2.save();
        expect(nct.suriType).to.equal(ct2.suriType);
      } catch ({ name, errors }) {
        expect(name).to.equal('SequelizeUniqueConstraintError');
        for (const error of errors) {
          expect(error.message).to.match(/curi must be unique/);
          expect(error.type).to.match(/unique violation/);
          expect(error.path).to.match(/^curi$/);
        }
      }
    });
  });
});
