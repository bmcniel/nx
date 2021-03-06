import { serializeJson } from '@nrwl/workspace';
import {
  checkFilesDoNotExist,
  checkFilesExist,
  ensureProject,
  forEachCli,
  newProject,
  readFile,
  readJson,
  renameFile,
  runCLI,
  runCLIAsync,
  uniq,
  updateFile,
  workspaceConfigName,
} from '@nrwl/e2e/utils';

forEachCli((currentCLIName) => {
  const linter = currentCLIName === 'angular' ? 'tslint' : 'eslint';

  describe('React Applications', () => {
    it('should be able to generate a react app + lib', async () => {
      ensureProject();
      const appName = uniq('app');
      const libName = uniq('lib');

      runCLI(
        `generate @nrwl/react:app ${appName} --no-interactive --linter=${linter}`
      );
      runCLI(`generate @nrwl/react:lib ${libName} --no-interactive`);

      // Libs should not include package.json by default
      checkFilesDoNotExist(`libs/${libName}/package.json`);

      const mainPath = `apps/${appName}/src/main.tsx`;
      updateFile(mainPath, `import '@proj/${libName}';\n` + readFile(mainPath));

      const libTestResults = await runCLIAsync(`test ${libName}`);
      expect(libTestResults.combinedOutput).toContain(
        'Test Suites: 1 passed, 1 total'
      );

      await testGeneratedApp(appName, {
        checkStyles: true,
        checkLinter: true,
        checkE2E: true,
      });
    }, 120000);

    it('should be able to generate a publishable react lib', async () => {
      ensureProject();
      const libName = uniq('lib');

      runCLI(
        `generate @nrwl/react:lib ${libName} --publishable --no-interactive`
      );

      const libTestResults = await runCLIAsync(`build ${libName} --extractCss`);
      expect(libTestResults.stdout).toContain('Bundle complete.');

      checkFilesExist(
        `dist/libs/${libName}/package.json`,
        `dist/libs/${libName}/index.d.ts`,
        `dist/libs/${libName}/${libName}.esm.css`,
        `dist/libs/${libName}/${libName}.esm.js`,
        `dist/libs/${libName}/${libName}.umd.css`,
        `dist/libs/${libName}/${libName}.umd.js`
      );
    }, 120000);

    it('should be able to generate a publishable react lib', async () => {
      ensureProject();
      const libName = uniq('lib');

      runCLI(
        `generate @nrwl/react:lib ${libName} --publishable --no-interactive`
      );

      const libTestResults = await runCLIAsync(
        `build ${libName} --no-extract-css`
      );
      expect(libTestResults.stdout).toContain('Bundle complete.');

      checkFilesExist(
        `dist/libs/${libName}/package.json`,
        `dist/libs/${libName}/index.d.ts`,
        `dist/libs/${libName}/${libName}.esm.js`,
        `dist/libs/${libName}/${libName}.umd.js`
      );

      checkFilesDoNotExist(
        `dist/libs/${libName}/${libName}.esm.css`,
        `dist/libs/${libName}/${libName}.umd.css`
      );

      await runCLIAsync(`build ${libName} --extract-css`);

      checkFilesExist(
        `dist/libs/${libName}/package.json`,
        `dist/libs/${libName}/index.d.ts`,
        `dist/libs/${libName}/${libName}.esm.css`,
        `dist/libs/${libName}/${libName}.esm.js`,
        `dist/libs/${libName}/${libName}.umd.css`,
        `dist/libs/${libName}/${libName}.umd.js`
      );
    }, 120000);

    it('should be able to generate a react lib with no components', async () => {
      ensureProject();
      const appName = uniq('app');
      const libName = uniq('lib');

      runCLI(
        `generate @nrwl/react:app ${appName} --no-interactive --linter=${linter}`
      );
      runCLI(
        `generate @nrwl/react:lib ${libName} --no-interactive --no-component`
      );

      const mainPath = `apps/${appName}/src/main.tsx`;
      updateFile(mainPath, `import '@proj/${libName}';\n` + readFile(mainPath));

      const libTestResults = await runCLIAsync(`test ${libName}`);
      expect(libTestResults.stderr).toBe('');

      await testGeneratedApp(appName, {
        checkStyles: true,
        checkLinter: true,
        checkE2E: false,
      });
    }, 120000);

    it('should not create a dist folder if there is an error', async () => {
      ensureProject();
      const libName = uniq('lib');

      runCLI(
        `generate @nrwl/react:lib ${libName} --publishable --no-interactive`
      );

      const mainPath = `libs/${libName}/src/lib/${libName}.tsx`;
      updateFile(mainPath, readFile(mainPath) + `\n console.log(a);`); // should error - "a" will be undefined

      await expect(runCLIAsync(`build ${libName}`)).rejects.toThrow(
        /Bundle failed/
      );
      expect(() => {
        checkFilesExist(`dist/libs/${libName}/package.json`);
      }).toThrow();
    }, 120000);

    it('should generate app with routing', async () => {
      ensureProject();
      const appName = uniq('app');

      runCLI(
        `generate @nrwl/react:app ${appName} --routing --no-interactive --linter=${linter}`
      );

      await testGeneratedApp(appName, {
        checkStyles: true,
        checkLinter: true,
        checkE2E: false,
      });
    }, 120000);

    it('should generate app with styled-components', async () => {
      ensureProject();
      const appName = uniq('app');

      runCLI(
        `generate @nrwl/react:app ${appName} --style styled-components --no-interactive --linter=${linter}`
      );

      await testGeneratedApp(appName, {
        checkStyles: false,
        checkLinter: true,
        checkE2E: false,
      });
    }, 120000);

    it('should generate an app with no styles', async () => {
      ensureProject();
      const appName = uniq('app');

      runCLI(
        `generate @nrwl/react:app ${appName} --style none --no-interactive --linter=${linter}`
      );

      await testGeneratedApp(appName, {
        checkStyles: false,
        checkLinter: true,
        checkE2E: false,
      });

      expect(() => checkFilesExist(`dist/apps/${appName}/styles.css`)).toThrow(
        /does not exist/
      );
      expect(readFile(`dist/apps/${appName}/index.html`)).not.toContain(
        `<link rel="stylesheet" href="styles.css">`
      );
    }, 120000);

    it('should be able to add a redux slice', async () => {
      ensureProject();
      const appName = uniq('app');
      const libName = uniq('lib');

      runCLI(`g @nrwl/react:app ${appName} --no-interactive`);
      runCLI(`g @nrwl/react:redux lemon --project=${appName}`);
      runCLI(`g @nrwl/react:lib ${libName} --no-interactive`);
      runCLI(`g @nrwl/react:redux orange --project=${libName}`);

      const appTestResults = await runCLIAsync(`test ${appName}`);
      expect(appTestResults.combinedOutput).toContain(
        'Test Suites: 2 passed, 2 total'
      );

      const libTestResults = await runCLIAsync(`test ${libName}`);
      expect(libTestResults.combinedOutput).toContain(
        'Test Suites: 2 passed, 2 total'
      );
    }, 120000);

    it('should be able to use JSX', async () => {
      ensureProject();
      const appName = uniq('app');
      const libName = uniq('lib');

      runCLI(
        `generate @nrwl/react:app ${appName} --no-interactive --linter=${linter}`
      );
      runCLI(`generate @nrwl/react:lib ${libName} --no-interactive`);

      renameFile(
        `apps/${appName}/src/main.tsx`,
        `apps/${appName}/src/main.jsx`
      );
      renameFile(
        `apps/${appName}/src/app/app.tsx`,
        `apps/${appName}/src/app/app.jsx`
      );
      renameFile(
        `apps/${appName}/src/app/app.spec.tsx`,
        `apps/${appName}/src/app/app.spec.jsx`
      );
      renameFile(
        `apps/${appName}/src/polyfills.ts`,
        `apps/${appName}/src/polyfills.js`
      );
      const angularJson = readJson(workspaceConfigName());

      angularJson.projects[
        appName
      ].architect.build.options.main = `apps/${appName}/src/main.jsx`;
      angularJson.projects[
        appName
      ].architect.build.options.polyfills = `apps/${appName}/src/polyfills.js`;
      updateFile(workspaceConfigName(), serializeJson(angularJson));

      const mainPath = `apps/${appName}/src/main.jsx`;
      updateFile(mainPath, `import '@proj/${libName}';\n` + readFile(mainPath));

      await testGeneratedApp(appName, {
        checkStyles: true,
        checkLinter: false,
        checkE2E: false,
      });
    }, 30000);

    async function testGeneratedApp(
      appName,
      opts: { checkStyles: boolean; checkLinter: boolean; checkE2E: boolean }
    ) {
      if (opts.checkLinter) {
        const lintResults = runCLI(`lint ${appName}`);
        expect(lintResults).toContain('All files pass linting.');
      }

      runCLI(`build ${appName}`);
      let filesToCheck = [
        `dist/apps/${appName}/index.html`,
        `dist/apps/${appName}/polyfills.js`,
        `dist/apps/${appName}/runtime.js`,
        `dist/apps/${appName}/vendor.js`,
        `dist/apps/${appName}/main.js`,
      ];
      if (opts.checkStyles) {
        filesToCheck.push(`dist/apps/${appName}/styles.js`);
      }
      checkFilesExist(...filesToCheck);
      expect(readFile(`dist/apps/${appName}/main.js`)).toContain(
        'const App = () =>'
      );
      runCLI(`build ${appName} --prod --output-hashing none`);
      filesToCheck = [
        `dist/apps/${appName}/index.html`,
        `dist/apps/${appName}/runtime.js`,
        `dist/apps/${appName}/polyfills.esm.js`,
        `dist/apps/${appName}/main.esm.js`,
        `dist/apps/${appName}/polyfills.es5.js`,
        `dist/apps/${appName}/main.es5.js`,
      ];
      if (opts.checkStyles) {
        filesToCheck.push(`dist/apps/${appName}/styles.css`);
      }
      checkFilesExist(...filesToCheck);
      if (opts.checkStyles) {
        expect(readFile(`dist/apps/${appName}/index.html`)).toContain(
          `<link rel="stylesheet" href="styles.css">`
        );
      }

      const testResults = await runCLIAsync(`test ${appName}`);
      expect(testResults.combinedOutput).toContain(
        'Test Suites: 1 passed, 1 total'
      );

      if (opts.checkE2E) {
        const e2eResults = runCLI(`e2e ${appName}-e2e`);
        expect(e2eResults).toContain('All specs passed!');
      }
    }
  });
});
