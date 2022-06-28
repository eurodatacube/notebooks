# Jupyter notebooks

Curated list of Jupyter notebooks demonstrating the capabilities of the Euro Data Cube offering. These notebooks can be directly executed by all Euro Data Cube customers within their own Jupyter Lab environment without further setup.

### Instructions for updating notebooks (admin only)

* For pull requests, make sure that the automatic checks succeed. If there's a problem during execution, fix the notebook in the branch (also remove the papermill error message in the notebook) and push an update, the automatic check will be triggered automatically.
* Update notebook bucket:  
  ```
  kubectl -n edc delete -f ~/git/flux-config/workloads/edc/update-notebooks-job.yaml
  kubectl -n edc apply -f ~/git/flux-config/workloads/edc/update-notebooks-job.yaml
  ```
* Cycle relevant services: `contribution-handler`, `nbviewer`:
  ```
  kubectl -n prod rollout restart deployment contribution-handler
  kubectl -n prod rollout restart deployment nbviewer
  ```
