const graphql = require('graphql');
const _ = require('lodash');
const User = require('../models/user');

const validateParseIdToken = require('../auth/validate-auth0-token');

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLSchema,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} = graphql; // Destructuring this variables from inside the package.

let roles = [
  {id: '1', name: 'Not Defined'},
  {id: '2', name: 'Developer'},
  {id: '3', name: 'Trader'},
  {id: '4', name: 'Data Analyst'}
];

// Types

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLID},
    authId: { type: GraphQLString},
    alias: {type: GraphQLString},
    firstName: {type: GraphQLString},
    lastName: {type: GraphQLString},
    isDeveloper: {type: GraphQLInt},
    isTrader: {type: GraphQLInt},
    isDataAnalyst: {type: GraphQLInt},
    role: {
      type: RoleType,
      resolve(parent, args) {
        return _.find(roles, {id: parent.roleId});
      }
    }
  })
});

const RoleType = new GraphQLObjectType({
  name: 'Role',
  fields: () => ({
    id: { type: GraphQLID},
    name: {type: GraphQLString},
    users: {
      type: new GraphQLList(UserType),
      resolve(parent, args) {
        return User.find({roleId: parent.id});
      }
    }
  })
});

// RootQueries

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
      user: {
        type: UserType,
        args: {id: {type: GraphQLID}},
        resolve(parent,args) {
          // Code to get data from data source.
          return User.findById(args.id);
        }
      },
      userByAuthId: {
        type: UserType,
        args: {authId: {type: GraphQLString}},
        resolve(parent,args) {
          // Code to get data from data source.

          return new Promise((resolve, reject) => {
          User.findOne({authId: args.authId}, (err, user) => {
            if(err) reject(err);
            else{
              if (user.authId === args.authId && user.authId !== undefined) {
                console.log(user );
                console.log(user.authId );
                console.log(args.authId );
                  return resolve(user);
                } else {
                  return null;
                }
            }
          })
        })

        }
      },
      role: {
        type: RoleType,
        args: {id: {type: GraphQLID}},
        resolve(parent,args) {
          // Code to get data from data source.
          return _.find(roles, {id: args.id});
        }
      },
      users: {
        type: new GraphQLList(UserType),
        resolve(parent, args){
          return User.find({});
        }
      },
      roles: {
        type: new GraphQLList(RoleType),
        resolve(parent, args){
          return roles;
        }
      }
  }
})

// Mutations

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    authenticate: {
    type: UserType,
    args: {
      idToken: {type: new GraphQLNonNull(GraphQLString)}
    },
    resolve(parent, { idToken }) {
      let userToken = null;

      return validateParseIdToken(idToken)
      .then(result => {
        console.log('validateParseIdToken', result);
        const authId = result.sub;
        const alias = result.nickname;

        let user = new User({
          alias: alias,
          authId: authId,
          roleId: "1"
        });
        console.log(authId, alias);
        user.save();
        return { authId, alias };
      })
      .catch(err => { return {error: err } })
    }
  },
    addUser:{
      type: UserType,
      args: {
        alias: {type: new GraphQLNonNull(GraphQLString)},
        authId: {type: new GraphQLNonNull(GraphQLString)}
      },
      resolve(parent, args) {

        let user = new User({
          alias: args.alias,
          authId: args.authId,
          roleId: "1"
        });
        return user.save();
      }
    },
    updateUser:{
      type: UserType,
      args: {
        id: {type: new GraphQLNonNull(GraphQLID)},
        firstName: {type: GraphQLString},
        lastName: {type: GraphQLString},
        isDeveloper: {type: GraphQLInt},
        isTrader: {type: GraphQLInt},
        isDataAnalyst: {type: GraphQLInt},
        roleId: {type: new GraphQLNonNull(GraphQLString)}
      },
      resolve(parent, args) {

        let key = {
          _id: args.id
        };

        let updatedUser = {
          firstName: args.firstName,
          lastName: args.lastName,
          isDeveloper: args.isDeveloper,
          isTrader: args.isTrader,
          isDataAnalyst: args.isDataAnalyst,
          roleId: args.roleId
        };

        return User.update(key, updatedUser);
      }
    }
  }
})

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation
});
