import antfu from '@antfu/eslint-config'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default antfu({
  react: true,
  typescript: true,
  yaml: false,
  ignores: ['dist/**', 'node_modules/**', 'bin/**'],
  rules: {
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
    'no-control-regex': 'off',
    'ts/no-use-before-define': 'off',
    'react-refresh/only-export-components': 'off',
    'react/no-array-index-key': 'off',
  },
});
