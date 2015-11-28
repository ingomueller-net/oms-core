//PREAMBLE STUFF
var assert = require('assert');
var ldap = require('ldapjs');
var log = require('./logger.js');

var config = require('config.json')();

var client = ldap.createClient({
  url: config.ldap.url,
  log: log
});

var ldap_top_dn = 'o=aegee, c=eu';

//TODO: change to a privileged but non root
client.bind('cn=admin,' + ldap_top_dn, config.ldap.rootpw, function(err) {
  client.log.info({err: err}, 'LDAP client binding');
  assert.ifError(err);
});


//API DEFINITION

//v0.0.8 - remember to bump version numbers
exports.findAllUsers = function(req, res , next) {
    req.log.debug({req: req}, 'findAllUsers request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = '(objectClass=aegeePersonFab)';

    searchLDAP(filter, searchDN, res);
};

//v0.0.8 - remember to bump version numbers
exports.findUser = function(req, res , next) {
    req.log.debug({req: req}, 'findUser request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = '(&(uid=' + req.params.userId +
                 ')(objectClass=aegeePersonFab))';

    searchLDAP(filter, searchDN, res);
};

//this finds the membership *of a person*
//v0.0.8 - remember to bump version numbers
exports.findMemberships = function(req, res , next) {
    req.log.debug({req: req}, 'findMemberships request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'uid=' + req.params.userId + ', ou=people, ' + ldap_top_dn;
    var filter = '(&(objectClass=aegeePersonMembership)!' +
                 '(memberType=Applicant))';

    searchLDAP(filter, searchDN, res);
};

//this finds the applications *to a body*
//v0.0.8 - remember to bump version numbers
//cannot do "find all applications" method because of API call routes
exports.findApplications = function(req, res , next) {
    req.log.debug({req: req}, 'findApplications request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = '(&(&(objectClass=aegeePersonMembership)' +
                 '(memberType=Applicant))(bodyCode=' +
                 req.params.bodyCode + '))';

    searchLDAP(filter, searchDN, res);
};

//this finds the members *of a body*
//v0.0.8 - remember to bump version numbers
//cannot do "find all applications" method because of API call routes
exports.findMembers = function(req, res , next) {
    req.log.debug({req: req}, 'findMembers request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=bodies, ' + ldap_top_dn;
    var filter = '(&(&(objectClass=aegeePersonMembership)' +
                 '(memberType=Member))(bodyCode=' +
                 req.params.bodyCode + '))';

    searchLDAP(filter, searchDN, res);
};

//v0.0.8 - remember to bump version numbers
exports.findAllAntennae = function(req, res , next) {
    req.log.debug({req: req}, 'findAllAntennae request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=bodies, ' + ldap_top_dn;
    var filter = '(&(objectClass=aegeeBodyFab)(bodyCategory=Local))';

    searchLDAP(filter, searchDN, res);
};

//v0.0.8 - remember to bump version numbers
exports.findAntenna = function(req, res , next) {
    req.log.debug({req: req}, 'findAntenna request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var searchDN = 'ou=bodies, ' + ldap_top_dn;
    var filter = '(&(bodyCode=' + req.params.bodyCode +
                 ')(objectClass=aegeeBodyFab))';

    searchLDAP(filter, searchDN, res);
};

//v0.0.1 - remember to bump version numbers
//TODO: check clashes between existing UIDs
exports.createUser = function(req, res , next) {
    req.log.debug({req: req}, 'createUser request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'ou=people, ' + ldap_top_dn;

    var entry = {
      sn: req.params.sn,
      givenName: req.params.givenName,
      cn: req.params.cn,
      uid: req.params.givenName + '.' + req.params.sn,
      mail: req.params.mail,
      userPassword: req.params.userPassword,
      birthDate: req.params.birthDate,
      objectclass: 'aegeePersonFab'
    };

    client.add('uid=' + entry.uid + ',' + baseDN, entry, function(err) {
      log.info({entry: entry, err: err}, 'Adding User');
      assert.ifError(err);
    });

    res.send(200, entry);

    //TRIGGER: apply to body registered with
};

//v0.0.1 - remember to bump version numbers
exports.createAntenna = function(req, res , next) {
    req.log.debug({req: req}, 'createAntenna request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'ou=bodies, ' + ldap_top_dn;

    var entry = {
      bodyCategory: req.params.bodyCategory,
      bodyCode: req.params.bodyCode, //TODO: check clashes between existing UIDs
      bodyNameAscii: req.params.bodyNameAscii,
      mail: req.params.mail,
      netcom: req.params.netcom,
      bodyStatus: 'C',              //if newly created, automatically is Contact
      objectclass: 'aegeeBodyFab'
    };

    var filter = 'bodyCode=' + entry.bodyCode + ',' + baseDN;
    client.add(filter, entry, function(err) {
      log.info({entry: entry, err: err}, 'Adding Antenna');
      assert.ifError(err);
    });

    res.send(200, entry);

    //TRIGGER: create local groups (e.g. board) entries

};

//v0.0.1 - remember to bump version numbers
//TODO: extend to multiple memberships?
exports.createApplication = function(req, res , next) {
    req.log.debug({req: req}, 'createApplication request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'uid=' + req.params.userId + ', ou=people, ' + ldap_top_dn;

    //TODO: check if UID already existing

    var entry = {
      bodyCategory: req.params.bodyCategory,
      bodyCode: req.params.bodyCode, //TODO: check clashes between existing UIDs
      bodyNameAscii: req.params.bodyNameAscii,
      mail: req.params.mail,
      uid: req.params.uid,
      cn: req.params.cn,
      memberSinceDate: req.params.memberSinceDate,
      memberUntilDate: req.params.memberUntilDate,
      memberType: 'Applicant',
      objectclass: 'aegeePersonMembership'
    };

    var filter = 'bodyCode=' + entry.bodyCode + ',' + baseDN;
    client.add(filter, entry, function(err) {
      log.info({entry: entry, err: err}, 'Adding Application');
      assert.ifError(err);
    });

    res.send(200, entry);

    //TRIGGER: send email to board of applied body

};

//v0.0.1 - remember to bump version numbers
//TODO: extend to multiple memberships?
exports.modifyMembership = function(req, res , next) {
    req.log.debug({req: req}, 'modifyMembership request');
    res.setHeader('Access-Control-Allow-Origin', '*');

    var baseDN = 'bodyCode=' + req.params.bodyCode + ',uid=' +
                 req.params.userId + ', ou=people, ' + ldap_top_dn;

    var change = new ldap.Change({
      operation: 'replace',
      modification: {
        // if changed to "suspended", the system won't remember what was before
        // that
        memberType: req.params.memberType
      }
    });

    client.modify(baseDN, change, function(err) {
      log.info({change: change, err: err}, 'Modifying Membership');
      assert.ifError(err);
    });

    var searchDN = 'ou=people, ' + ldap_top_dn;
    var filter = '(&(uid=' + req.params.userId +
                 ')(objectClass=aegeeMembershipFab))';

    searchLDAP(filter, searchDN, res);


    // TODO: membership should begin from acceptance date, not from application
    // date (maybe)

    //TRIGGER: send email to user about application to body confirmed/rejected
};


//HELPER METHODS


//Usage: <filter, basedn, result object>
//  searchLDAP("objectClass=aegeePersonFab", 'ou=people, '+ldap_top_dn, res );
//v0.1.0
searchLDAP = function(searchFilter, searchDN, res) {

  //set search parameters
    var opts = {
      filter: searchFilter,
      scope: 'sub',
      attributes: ''
    };

    var results = [];

    client.search(searchDN, opts, function(err, ldapres) {
        log.debug({searchDN: searchDN, searchFilter: searchFilter, err: err},
                  'Client search');
        assert.ifError(err);

        ldapres.on('searchEntry', function(entry) {
          log.debug({entry: entry.object}, 'Client search: searchEntry');
          results.push(entry.object);
        });
        ldapres.on('searchReference', function(referral) {
          log.debug({referral: referral.uris.join()},
                    'Client search: searchReference');
        });
        ldapres.on('error', function(err) {
          log.error({searchDN: searchDN, searchFilter: searchFilter, err: err},
                    'Client search: error');
        });
        ldapres.on('end', function(result) {
          log.debug({result: result.status, results: results},
                    'Client search: end');
          res.send(200, results);
        });
    });

};
