pipeline {
  agent any
  options { timestamps() }

  environment {
    APP = "auth-server"
    RUNTIME_ROOT = "/opt/runtime/${APP}"
    EMAIL = "ci@mspkapps.in"
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

    stage('Build & Push Images') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-creds',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh '''
            bash -lc '
              set -e

              echo "🔐 Loading environment variables..."
              source scripts/load-env.sh

              echo "🔐 Logging into Docker Hub..."
              echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

              echo "🏗️ Building images..."
              docker compose \
                -f docker/docker-compose.ci.yml \
                build

              echo "📦 Pushing images..."
              docker compose \
                -f docker/docker-compose.ci.yml \
                push
            '
          '''
        }
      }
    }

    stage('Sync Infra Files') {
      steps {
        sh '''
          set -e
          mkdir -p ${RUNTIME_ROOT}

          cp docker/docker-compose.base.yml \
             docker/docker-compose.prod.yml \
             ${RUNTIME_ROOT}/
        '''
      }
    }

    stage('Deploy to Production') {
      steps {
        sh '''
          set -e

          docker pull mspkapps/cpanel-backend:${IMAGE_TAG}
          docker pull mspkapps/cpanel-frontend:${IMAGE_TAG}
          docker pull mspkapps/dev-backend:${IMAGE_TAG}
          docker pull mspkapps/dev-frontend:${IMAGE_TAG}

          cd ${RUNTIME_ROOT}

          docker compose \
            -f docker-compose.base.yml \
            -f docker-compose.prod.yml \
            up -d
        '''
      }
    }
  }

  post {
    success {
      emailext(
        to: EMAIL,
        subject: "✅ ${APP} deployed to PRODUCTION (Build #${BUILD_NUMBER})",
        body: """
SUCCESS ✅

Application : ${APP}
Build Number: ${BUILD_NUMBER}
Image Tag   : ${IMAGE_TAG}
Branch      : main
""",
        attachLog: true,
        compressLog: true
      )
    }

    failure {
      emailext(
        to: EMAIL,
        subject: "❌ ${APP} CI FAILED (Build #${BUILD_NUMBER})",
        body: """
FAILURE ❌

Application : ${APP}
Build Number: ${BUILD_NUMBER}
Branch      : test → main

❌ Production was NOT touched.
""",
        attachLog: true,
        compressLog: true
      )
    }
  }

}
