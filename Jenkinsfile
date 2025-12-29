pipeline {
  agent any
  options { timestamps() }

  environment {
    APP = "auth-server"
    EMAIL = "ci@mspkapps.in"
    IMAGE_TAG = "prod-${BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Load Env') {
      steps {
        sh 'bash scripts/load-env.sh'
      }
    }

    stage('Build Images (CI validation)') {
      steps {
        sh '''
          docker compose \
            -f docker/docker-compose.base.yml \
            -f docker/docker-compose.prod.yml \
            build
        '''
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
            git config user.email "ci@mspkapps.in"

            git remote set-url origin https://${GIT_USER}:${GIT_TOKEN}@github.com/MSPK-APPS/auth-server.git

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

    stage('Build & Deploy') {
      steps {
        sh '''
          bash -lc '
            set -e
            set -a

            source /opt/envs/frontend.prod.env
            source /opt/envs/cpanel-backend.env
            source /opt/envs/dev-backend.env
            source /opt/envs/dev-frontend.env

            set +a

            docker compose \
              -f docker/docker-compose.base.yml \
              -f docker/docker-compose.prod.yml \
              up -d
          '
        '''
      }
    }


  }

  post {
    success {
      mail(
        to: EMAIL,
        subject: "✅ ${APP} deployed to PRODUCTION",
        body: """
        Application: ${APP}
        Image tag: ${IMAGE_TAG}
        Status: SUCCESS
        Source branch: test
        """
      )
    }

    failure {
      mail(
        to: EMAIL,
        subject: "❌ ${APP} CI failed (no prod deploy)",
        body: """
        Application: ${APP}
        Status: FAILED
        Production was NOT touched
        """
      )
    }
  }
}
