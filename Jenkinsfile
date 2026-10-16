pipeline {
  agent {
    label 'linux'
  }

  options {
    skipDefaultCheckout(true)
    timestamps()
    timeout(time: 60, unit: 'MINUTES')
  }

  parameters {
    string(name: 'BASE_URL', defaultValue: '', description: 'Approved non-production application URL.')
    string(name: 'API_BASE_URL', defaultValue: '', description: 'Approved non-production API URL.')
    string(name: 'EVENT_CITY', defaultValue: '', description: 'City for the dedicated test event.')
    string(name: 'EVENT_VENUE', defaultValue: '', description: 'Venue for the dedicated test event.')
    string(name: 'TEST_CUSTOMER_NAME', defaultValue: '', description: 'Synthetic test customer name.')
    string(name: 'TEST_CUSTOMER_EMAIL', defaultValue: '', description: 'Synthetic test customer email.')
    string(name: 'TEST_CUSTOMER_PHONE', defaultValue: '', description: 'Synthetic test customer phone.')
  }

  tools {
    nodejs 'NodeJS 24'
  }

  environment {
    CI = 'true'
    TEST_ENV = 'qa'
    BROWSER = 'chromium'
    HEADLESS = 'true'
    PLAYWRIGHT_HEADED = 'false'
    CUCUMBER_PARALLEL = '0'
  }

  stages {
    stage('Source checkout') {
      steps {
        deleteDir()
        checkout scm
      }
    }

    stage('Verify Node.js environment') {
      steps {
        sh '''
          set -eu
          node --version
          npm --version
          node -e "const major = Number(process.versions.node.split('.')[0]); if (major < 22 || major >= 25) { console.error('Node.js 22, 23, or 24 is required.'); process.exit(1); }"
          java -version
        '''
      }
    }

    stage('Install dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Install Chromium and Linux dependencies') {
      steps {
        sh 'npx playwright install --with-deps chromium'
      }
    }

    stage('Lint and formatting checks') {
      steps {
        sh '''
          npm run lint
          npm run format:check
        '''
      }
    }

    stage('Unit and configuration tests') {
      steps {
        sh '''
          npm run test:config
          npm run test:ui:unit
          npm run test:e2e:utils
          npm run test:global-cache
          npm run test:reporting
          npm run test:vscode
        '''
      }
    }

    stage('Cucumber/Playwright end-to-end tests') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'eventhub-qa-test-account',
            usernameVariable: 'TEST_USERNAME',
            passwordVariable: 'TEST_PASSWORD'
          )
        ]) {
          sh '''
            set +x
            set -eu
            : "${BASE_URL:?Set the BASE_URL Jenkins build parameter.}"
            : "${API_BASE_URL:?Set the API_BASE_URL Jenkins build parameter.}"
            : "${EVENT_CITY:?Set the EVENT_CITY Jenkins build parameter.}"
            : "${EVENT_VENUE:?Set the EVENT_VENUE Jenkins build parameter.}"
            : "${TEST_CUSTOMER_NAME:?Set the TEST_CUSTOMER_NAME Jenkins build parameter.}"
            : "${TEST_CUSTOMER_EMAIL:?Set the TEST_CUSTOMER_EMAIL Jenkins build parameter.}"
            : "${TEST_CUSTOMER_PHONE:?Set the TEST_CUSTOMER_PHONE Jenkins build parameter.}"
            : "${TEST_USERNAME:?Configure the eventhub-qa-test-account Jenkins credential.}"
            : "${TEST_PASSWORD:?Configure the eventhub-qa-test-account Jenkins credential.}"
            npm run test:e2e
          '''
        }
      }
    }
  }

  post {
    always {
      script {
        if (fileExists('reports/allure-results') && fileExists('node_modules/.bin/allure')) {
          catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
            sh 'npm run report:allure'
          }
        }
      }
      junit testResults: 'reports/cucumber-junit.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'reports/**,test-results/**', allowEmptyArchive: true
    }
    failure {
      echo 'The build failed. Review the failed stage and archived reports; test failures are not ignored.'
    }
  }
}
