"""Meeting deck endpoints."""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

router = APIRouter()


class CreateMeetingDeckBody(BaseModel):
    meetingId: str
    deckName: str
    deckUrl: str | None = None


# GET /api/meeting-decks?meetingId= -- List decks for a meeting
@router.get("")
async def get_meeting_decks(
    meetingId: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        params: dict = {}
        if meetingId:
            where = "meeting_id = :meeting_id"
            params["meeting_id"] = meetingId
        else:
            where = "1=1"

        result = await db.execute(
            text(f"SELECT * FROM eam.eam_meeting_deck WHERE {where}"),
            params,
        )
        rows = result.mappings().all()
        return [
            {
                "id": r["id"],
                "meetingId": r["meeting_id"],
                "deckName": r["deck_name"],
                "deckUrl": r["deck_url"],
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch meeting decks"})


# POST /api/meeting-decks -- Add deck reference
@router.post("", status_code=201)
async def create_meeting_deck(
    body: CreateMeetingDeckBody,
    db: AsyncSession = Depends(get_db),
):
    try:
        if not body.meetingId or not body.deckName:
            return JSONResponse(status_code=400, content={"error": "meetingId and deckName required"})

        result = await db.execute(
            text("""
                INSERT INTO eam.eam_meeting_deck (id, meeting_id, deck_name, deck_url)
                VALUES (gen_random_uuid(), :meeting_id, :deck_name, :deck_url)
                RETURNING id, meeting_id, deck_name, deck_url
            """),
            {
                "meeting_id": body.meetingId,
                "deck_name": body.deckName,
                "deck_url": body.deckUrl,
            },
        )
        await db.commit()
        row = result.mappings().one()
        return {
            "id": row["id"],
            "meetingId": row["meeting_id"],
            "deckName": row["deck_name"],
            "deckUrl": row["deck_url"],
        }
    except Exception as e:
        await db.rollback()
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to create meeting deck"})


# DELETE /api/meeting-decks/:id -- Remove deck
@router.delete("/{deck_id}")
async def delete_meeting_deck(
    deck_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        await db.execute(
            text("DELETE FROM eam.eam_meeting_deck WHERE id = :id"),
            {"id": deck_id},
        )
        await db.commit()
        return {"message": "Meeting deck removed"}
    except Exception as e:
        await db.rollback()
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to delete meeting deck"})
