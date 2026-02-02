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
            set -e

            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            export IMAGE_TAG=prod-${BUILD_NUMBER}

            docker compose \
              -f docker/docker-compose.ci.yml \
              build

            docker compose \
              -f docker/docker-compose.ci.yml \
              push
          '''
        }
      }
    }

    stage('Sync Infra Files') {
      steps {
        sh '''
          set -e
          cp docker/docker-compose.base.yml docker/docker-compose.prod.yml /opt/auth-server/
        '''
      }
    }

    stage('Deploy to Production') {
      steps {
        sh '''
          set -e

          export IMAGE_TAG=prod-${BUILD_NUMBER}

          docker pull mspkapps/cpanel-backend:$IMAGE_TAG
          docker pull mspkapps/cpanel-frontend:$IMAGE_TAG
          docker pull mspkapps/dev-backend:$IMAGE_TAG
          docker pull mspkapps/dev-frontend:$IMAGE_TAG

          cd /opt/auth-server
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

              See attached Jenkins build log for details.
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
              See attached Jenkins build log for exact error.
              """,
        attachLog: true,
        compressLog: true
      )
    }
  }

}
