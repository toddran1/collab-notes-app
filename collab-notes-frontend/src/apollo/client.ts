import { ApolloClient, InMemoryCache, split, HttpLink, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({ uri: 'http://localhost:4000/graphql' });

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('token');
  if (token) {
    operation.setContext({
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  return forward(operation);
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}));

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink)
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
