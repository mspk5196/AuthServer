pipeline {
  agent any
  options { timestamps() }

  environment {
    APP = "auth-server"
    EMAIL = "ci@mspkapps.in"
    IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Detect Env') {
      steps {
        script {
          env.ENV = (env.BRANCH_NAME == 'main') ? 'prod' : 'test'
          echo "ENV=${env.ENV}"
          echo "IMAGE_TAG=${IMAGE_TAG}"
        }
      }
    }

    stage('Load Env') {
      steps {
        sh 'bash scripts/load-env.sh'
      }
    }

    stage('Build Images') {
      steps {
        sh """
          docker compose \
            -f docker/docker-compose.base.yml \
            -f docker/docker-compose.${ENV}.yml \
            build
        """
      }
    }

    stage('Deploy') {
      steps {
        sh """
          docker compose \
            -f docker/docker-compose.base.yml \
            -f docker/docker-compose.${ENV}.yml \
            up -d
        """
      }
    }

    /* ===============================
       AUTO MERGE test → main
       =============================== */
    stage('Auto Merge test → main') {
      when { branch 'test' }
      steps {
        catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
          withCredentials([usernamePassword(
            credentialsId: 'github-ci-token',
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_TOKEN'
          )]) {
            sh '''
              set -e

              git config user.name "Jenkins CI"
              git config user.email "ci@mspkapps.in"

              # 🔐 Override origin with authenticated URL
              git remote set-url origin https://${GIT_USER}:${GIT_TOKEN}@github.com/MSPK-APPS/auth-server.git

              git fetch origin
              git checkout main
              git merge test --no-ff -m "ci: auto-merge test → main"

              git push origin main
            '''
          }
        }
      }
    }

  }

  post {
    success {
      mail(
        to: EMAIL,
        subject: "✅ ${APP} deployed (${env.BRANCH_NAME})",
        body: """
              Application: ${APP}
              Branch: ${env.BRANCH_NAME}
              Image tag: ${IMAGE_TAG}
              Status: SUCCESS
              """
      )
    }

    failure {
      script {
        if (env.BRANCH_NAME == 'main') {
          sh 'bash scripts/rollback.sh prod'
        } else {
          echo "Skipping rollback for test environment"
        }
      }

      mail(
        to: EMAIL,
        subject: "❌ ${APP} failed (${env.BRANCH_NAME})",
        body: """
              Application: ${APP}
              Branch: ${env.BRANCH_NAME}
              Image tag: ${IMAGE_TAG}
              Status: FAILED
              """
      )
    }
  }

}
