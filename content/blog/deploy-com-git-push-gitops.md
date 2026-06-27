---
title: "Deploy com git push: GitOps no homelab"
date: 2026-06-24
authors:
  - name: thiagotn
tags:
  - homelab
  - gitops
  - argocd
  - ci-cd
---

No começo eu fazia deploy via SSH + `kubectl set image`. Funciona, mas depende de eu estar logado
numa máquina de casa e lembrar dos comandos. Troquei isso por **GitOps** com **Argo CD**.

## A ideia

O Argo CD observa um repositório git e mantém o cluster igual ao que está versionado. **Deploy passa
a ser `git push`**: nada de `kubectl` na mão.

O fluxo de uma app (como este blog):

1. Eu dou `git push` no repo do site.
2. O **CI** (GitHub Actions) builda a imagem do container e publica no GHCR.
3. Um segundo job escreve a nova tag no `kustomization.yaml` do repo de infra (write-back).
4. O **Argo CD** detecta o commit e faz o rollout sozinho.

## O detalhe de segurança que eu gosto

O **cluster é read-only para o CI**: o runner da nuvem não alcança a API do Kubernetes (ela fica
fechada). O que o CI faz é só **commitar** no repo de infra. A credencial de escrita vive nos
secrets do GitHub Actions, nunca dentro do cluster. Se o CI for comprometido, o estrago é um commit
revertível — não acesso ao cluster.

`selfHeal` ligado significa que, se eu mexer no cluster na mão, o Argo reverte para o que está no
git. O git é a fonte da verdade, e isso é libertador.
