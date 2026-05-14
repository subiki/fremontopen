# Frontend

Static React app for Fremont Open billiards stats.

Common commands:

```powershell
yarn start
$env:REACT_APP_STATIC_DATA='true'; yarn build
```

The deployed build reads `public/data/cache.json`; it does not require a public
API server.
