# EntryPointService

`propertyhash` for the constructor needs

1. `port` - this is the port at which the `http` service will be opened.
2. `target` - this is a string in one of the two following forms:
    - `instancename:RemoteServiceTargetName`
    - `classname:RemoteServiceTargetClassName` (not implemented yet)
3. `strategies` - hash of propertyhashes mapped to corresponding strategy names.

## Processing the `target` string

### `instancename`
If the `target` string is of the `instancename:RemoteServiceTargetName` form,
EntryPointService will enter the "SingleTarget hunt" mode. All the users passing
the `authenticate` method will be forwarded to this SingleTarget (once found).

### `classname` (not implemented yet)
If the `target` string is of the `classname:RemoteServiceTargetClassName` form,
EntryPointService will look for all the available services of the
`RemoteServiceTargetClassName` class. Once a user passes the `authenticate` method,
she will be forwarded to one of the Services found (in accordance to the algorithm
that still has to be implemented yet).

## `remote` strategy
If the `strategies` hash has a `remote` key with a corresponding propertyhash, it
should have a form like
```javascript
{...
  remote: {
    sinkanme: 'NameOfTheRemoteResolverService',
    identity: {name: 'somename', role: 'user'}
  }
}
```

The `remote` strategy will be used in the `authenticate` method in a standard way,
by implicitly calling the `resolveUser` method on the remote `NameOfTheRemoteResolverService`
service (that is an instance of allex_userresolverservice or its descendant).

On the other side, the EntryPointService will additionally connect to `NameOfTheRemoteResolverService`
to issue the following calls:
- `registerUser` (exposes the `register` "url path" on the `http` service)
- `usernameExists` (exposes the `usernameExists` "url path" on the `http` service)
- `usernamesLike` (not implemented yet)
- `fetchUser` (implicitly used in `checkSession` for user reconnection)

