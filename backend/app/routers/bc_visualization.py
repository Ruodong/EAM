"""BC Visualization router — BCM data in visualization-ready format (Module C)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

from app.auth import require_permission, require_role, Role

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /bcm/visualization — BCM data in visualization-ready format
# ---------------------------------------------------------------------------

@router.get("/bcm/visualization", dependencies=[Depends(require_permission("bcm", "read"))])
async def bcm_visualization(
    db: AsyncSession = Depends(get_db),
    version: str | None = Query(None),
):
    try:
        params: dict[str, Any] = {}
        version_filter = ""
        if version:
            version_filter = "WHERE m.data_version = :p_version"
            params["p_version"] = version

        result = await db.execute(
            text(
                f"SELECT b.app_id, "
                f"COALESCE(NULLIF(a.app_name,''), c.name, b.app_id) as app_name, "
                f"COALESCE(c.app_full_name, '') as app_full_name, "
                f"COALESCE(NULLIF(a.app_ownership,''), c.app_ownership, '') as app_ownership, "
                f"COALESCE(NULLIF(a.app_solution_owner,''), c.owned_by, '') as app_solution_owner, "
                f"COALESCE(NULLIF(a.app_it_owner,''), c.app_it_owner, '') as app_it_owner, "
                f"COALESCE(NULLIF(a.portfolio_mgt,''), c.portfolio_mgt, '') as portfolio_mgt, "
                f"COALESCE(NULLIF(a.app_solution_type,''), c.app_solution_type, '') as app_solution_type, "
                f"COALESCE(NULLIF(a.app_classification,''), c.app_classification, '') as app_classification, "
                f"COALESCE(NULLIF(a.current_state,''), c.u_status, '') as app_status, "
                f"COALESCE(a.business_function, '') as biz_function, "
                f"COALESCE(c.owned_by, '') as owned_by, "
                f"COALESCE(c.app_owner_tower, '') as app_owner_tower, "
                f"COALESCE(c.app_owner_domain, '') as app_owner_domain, "
                f"COALESCE(c.app_dt_owner, '') as app_dt_owner, "
                f"COALESCE(NULLIF(a.app_description,''), c.short_description, '') as app_description, "
                f"COALESCE(m.geo, '') as geo, "
                f"tco.actual_k, "
                f"m.bc_id, m.bc_name, "
                f"COALESCE(m.bc_name_cn, '') as bc_name_cn, "
                f"m.lv1_domain, m.lv2_sub_domain, m.lv3_capability_group, "
                f"COALESCE(m.parent_bc_id, '') as parent_bc_id, "
                f"COALESCE(m.bc_description, '') as bc_description, "
                f"m.level, m.data_version "
                f"FROM eam.biz_cap_map b "
                f"JOIN eam.bcpf_master_data m ON b.bcpf_master_id = m.id "
                f"LEFT JOIN eam.project_app a ON b.app_id = a.app_id "
                f"LEFT JOIN eam.cmdb_application c ON b.app_id = c.app_id "
                f"LEFT JOIN eam.application_tco tco ON b.app_id = tco.app_id "
                f"{version_filter} "
                f"ORDER BY m.lv1_domain, m.lv2_sub_domain, m.bc_id, b.app_id"
            ),
            params,
        )
        rows = [dict(r._mapping) for r in result.fetchall()]

        if not rows:
            return {
                "capabilities": [],
                "applications": [],
                "mappings": [],
                "domains": [],
                "dataVersion": "",
            }

        valid_rows = [r for r in rows if r.get("lv1_domain") and r.get("bc_id")]

        # Unique L1 domain names
        l1_domain_names = sorted(set(r["lv1_domain"] for r in valid_rows))

        # Build L1 nodes
        l1_nodes = [
            {
                "id": f"L1-{domain}",
                "name": domain,
                "nameCn": "",
                "level": 1,
                "parentId": None,
                "domain": domain,
                "description": "",
                "appCount": 0,
                "applications": [],
            }
            for domain in l1_domain_names
        ]

        # Build L2 nodes
        l2_pair_set: set[str] = set()
        l2_pairs: list[dict] = []
        for r in valid_rows:
            key = f"{r['lv1_domain']}|{r['lv2_sub_domain']}"
            if key not in l2_pair_set:
                l2_pair_set.add(key)
                l2_pairs.append({
                    "domain": r["lv1_domain"],
                    "subDomain": r["lv2_sub_domain"],
                    "parentBcId": r.get("parent_bc_id") or "",
                })
        l2_nodes = [
            {
                "id": pair["parentBcId"] or f"L2-{pair['domain']}-{pair['subDomain']}",
                "name": pair["subDomain"],
                "nameCn": "",
                "level": 2,
                "parentId": f"L1-{pair['domain']}",
                "domain": pair["domain"],
                "description": "",
                "appCount": 0,
                "applications": [],
            }
            for pair in l2_pairs
        ]

        # Build L3 nodes
        l3_seen: set[str] = set()
        l3_nodes: list[dict] = []
        for row in valid_rows:
            bc_id = row["bc_id"]
            if bc_id in l3_seen:
                continue
            l3_seen.add(bc_id)
            bc_rows = [r for r in valid_rows if r["bc_id"] == bc_id]
            # Collect unique apps for this capability
            app_seen_inner: set[str] = set()
            apps: list[dict] = []
            for r in bc_rows:
                if r["app_id"] not in app_seen_inner:
                    app_seen_inner.add(r["app_id"])
                    apps.append({
                        "id": r["app_id"],
                        "name": r["app_name"],
                        "status": r.get("app_status", ""),
                        "geo": r.get("geo") or "",
                        "portfolioMgt": r.get("portfolio_mgt") or "",
                    })
            l2_parent = next(
                (n for n in l2_nodes if n["domain"] == row["lv1_domain"] and n["name"] == row["lv2_sub_domain"]),
                None,
            )
            l3_nodes.append({
                "id": bc_id,
                "name": row["bc_name"],
                "nameCn": row.get("bc_name_cn") or "",
                "level": 3,
                "parentId": l2_parent["id"] if l2_parent else None,
                "domain": row["lv1_domain"],
                "description": row.get("bc_description") or "",
                "appCount": len(apps),
                "applications": apps,
            })

        # Build applications list
        app_seen: set[str] = set()
        applications: list[dict] = []
        for row in valid_rows:
            if row["app_id"] in app_seen:
                continue
            app_seen.add(row["app_id"])
            app_rows = [r for r in valid_rows if r["app_id"] == row["app_id"]]
            cap_set: set[str] = set()
            capabilities: list[dict] = []
            for r in app_rows:
                if r["bc_id"] not in cap_set:
                    cap_set.add(r["bc_id"])
                    capabilities.append({
                        "bcId": r["bc_id"],
                        "bcName": r["bc_name"],
                        "lv1Domain": r["lv1_domain"],
                        "lv2SubDomain": r["lv2_sub_domain"],
                        "lv3CapGroup": r["lv3_capability_group"],
                    })
            applications.append({
                "appId": row["app_id"],
                "appName": row["app_name"],
                "appFullName": row.get("app_full_name") or "",
                "appOwnership": row.get("app_ownership"),
                "appSolutionOwner": row.get("app_solution_owner"),
                "appItOwner": row.get("app_it_owner"),
                "ownedBy": row.get("owned_by") or "",
                "appOwnerTower": row.get("app_owner_tower") or "",
                "appOwnerDomain": row.get("app_owner_domain") or "",
                "appDtOwner": row.get("app_dt_owner") or "",
                "portfolioMgt": row.get("portfolio_mgt"),
                "appSolutionType": row.get("app_solution_type"),
                "appClassification": row.get("app_classification"),
                "appStatus": row.get("app_status"),
                "appDescription": row.get("app_description") or "",
                "bizFunction": row.get("biz_function"),
                "geo": row.get("geo"),
                "actualK": float(row["actual_k"]) if row.get("actual_k") is not None else None,
                "capabilities": capabilities,
            })

        # Build mappings
        mapping_set: set[str] = set()
        mappings: list[dict] = []
        for r in valid_rows:
            key = f"{r['app_id']}|{r['bc_id']}"
            if key not in mapping_set:
                mapping_set.add(key)
                mappings.append({"appId": r["app_id"], "bcId": r["bc_id"]})

        return {
            "capabilities": l1_nodes + l2_nodes + l3_nodes,
            "applications": applications,
            "mappings": mappings,
            "domains": l1_domain_names,
            "dataVersion": valid_rows[0].get("data_version", "") if valid_rows else "",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch BCM visualization data") from e
