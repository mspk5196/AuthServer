pipeline {
  agent any
  options { timestamps() }

  environment {
    APP = "auth-server"
    EMAIL = "praneshkarthims@gmail.com"
    IMAGE_TAG = "prod-${BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Merge test → main') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'github-ci-token',
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e
            git config user.name "Jenkins CI"
            git config user.email "praneshkarthims@gmail.com"

            git remote set-url origin https://${GIT_USER}:${GIT_TOKEN}@github.com/mspk5196/AuthServer.git

            git fetch origin \
              +refs/heads/main:refs/remotes/origin/main \
              +refs/heads/test:refs/remotes/origin/test

            git checkout -B main origin/main
            git merge origin/test --no-ff -m "ci: promote test → prod"
            git push origin main
          '''
        }
      }
    }

    stage('Build & Deploy (PRODUCTION)') {
      steps {
        sh '''
          bash -lc '
            set -e
            set -a

            source /opt/envs/frontend.prod.env
            source /opt/envs/cpanel-backend.env
            source /opt/envs/cpanel-frontend.env
            source /opt/envs/dev-backend.env
            source /opt/envs/dev-frontend.env

            set +a

            docker compose -p auth-server \
              -f docker/docker-compose.base.yml \
              -f docker/docker-compose.prod.yml \
              build

            docker compose -p auth-server \
              -f docker/docker-compose.base.yml \
              -f docker/docker-compose.prod.yml \
              up -d
          '
        '''
      }
    }
  }

  // post {
    // success {
      // emailext(
      //   to: EMAIL,
      //   subject: "✅ ${APP} deployed to PRODUCTION (Build #${BUILD_NUMBER})",
      //   body: """
      //         SUCCESS ✅

      //         Application : ${APP}
      //         Build Number: ${BUILD_NUMBER}
      //         Image Tag   : ${IMAGE_TAG}
      //         Branch      : main

      //         See attached Jenkins build log for details.
      //         """,
      //   attachLog: true,
      //   compressLog: true
      // )
    // }

    // failure {
      // emailext(
      //   to: EMAIL,
      //   subject: "❌ ${APP} CI FAILED (Build #${BUILD_NUMBER})",
      //   body: """
      //         FAILURE ❌

      //         Application : ${APP}
      //         Build Number: ${BUILD_NUMBER}
      //         Branch      : test → main

      //         ❌ Production was NOT touched.
      //         See attached Jenkins build log for exact error.
      //         """,
      //   attachLog: true,
      //   compressLog: true
      // )
    // }
  // }

}
