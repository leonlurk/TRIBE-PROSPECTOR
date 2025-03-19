export default (api) => {
  api.cache(true);
  
  return {
    presets: [
      ['@babel/preset-env', {
        targets: {
          node: '18'
        }
      }]
    ]
  };
};