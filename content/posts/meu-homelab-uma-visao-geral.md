---
title: "Meu homelab: uma visão geral"
date: 2026-06-27
tags:
  - homelab
  - kubernetes
  - infraestrutura
---

Faz um tempo que mantenho um **homelab** em casa: um mini PC rodando **Kubernetes** que hospeda
meus projetos pessoais e serve de laboratório para aprender infraestrutura na prática. Este post é
um panorama do que ele faz e das ideias por trás dele — sem entrar em detalhes de configuração.

## O hardware

Nada de especial: um mini PC de mesa, dessas máquinas corporativas reaproveitadas, com um
processador modesto e RAM suficiente para um nó único. A graça justamente é fazer bastante coisa
caber num hardware pequeno e silencioso, ligado 24/7 num canto.

## Kubernetes em casa

Rodo o **k3s**, uma distribuição leve de Kubernetes. Para um nó só, é ideal: sobe rápido, pesa
pouco e ainda é Kubernetes "de verdade" — então tudo que aprendo aqui vale no mundo lá fora. Em
cima dele rodam um ingress controller (que cuida do roteamento e do HTTPS), emissão automática de
certificados, um banco de dados compartilhado e as aplicações em si.

## Tudo como código

Quase nada é feito clicando ou digitando comando solto. O provisionamento do host é **Ansible**; a
configuração do cluster são manifests e charts versionados em git. Se a máquina morrer, eu
reconstruo o ambiente a partir do repositório.

## Deploy é `git push`

A parte que mais gosto: adotei **GitOps**. Um agente dentro do cluster observa o repositório e
mantém o estado igual ao que está versionado. Publicar uma mudança é só dar `git push` — o pipeline
builda a imagem e o cluster se atualiza sozinho. Sem `kubectl` na mão, e com histórico de tudo no
git.

## Acesso de qualquer lugar, com a porta da frente fechada

A administração remota é feita por uma **malha privada** (VPN baseada em WireGuard), self-hosted.
Assim eu administro o ambiente de fora de casa **sem** abrir o painel de controle do cluster para a
internet. O princípio é simples: expor o mínimo possível e manter o acesso administrativo numa rede
privada e cifrada.

## Ver o que está acontecendo

Por último, montei uma stack de **observabilidade**: métricas (CPU, memória, latência das
requisições), logs centralizados e checagem de disponibilidade dos serviços, com alertas. Quando
algo quebra, eu fico sabendo — de preferência antes de alguém me avisar.

---

Nada disso é "produção séria" — é um parquinho que me ensina muito e ainda hospeda coisas reais. Vou
escrevendo por aqui as partes mais interessantes conforme evoluo. Se o site sair do ar em algum
momento, provavelmente é a energia ou a internet de casa. 🙂
