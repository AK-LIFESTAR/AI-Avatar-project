import os
import sys
import json
from uuid import uuid4
from pathlib import Path
import numpy as np
from datetime import datetime
from fastapi import APIRouter, WebSocket, UploadFile, File, Response, HTTPException
from pydantic import BaseModel
from starlette.responses import JSONResponse
from starlette.websockets import WebSocketDisconnect
from loguru import logger
from ruamel.yaml import YAML
from .service_context import ServiceContext
from .websocket_handler import WebSocketHandler
from .proxy_handler import ProxyHandler


def _get_base_dir() -> Path:
    """Get the base directory for config files."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    # In dev mode, assume routes.py is at src/open_llm_vtuber/routes.py
    return Path(__file__).resolve().parents[2]


class ApiKeyRequest(BaseModel):
    """Request model for API key configuration."""
    api_key: str
    provider: str = "openai_llm"


class ComputerUseRequest(BaseModel):
    """Request model for computer use configuration."""
    enabled: bool = False


def init_config_routes() -> APIRouter:
    """
    Create and return API routes for configuration management.
    
    Returns:
        APIRouter: Configured router with config endpoints.
    """
    router = APIRouter(prefix="/api/config", tags=["config"])
    yaml = YAML()
    yaml.preserve_quotes = True
    
    @router.post("/api-key")
    async def save_api_key(request: ApiKeyRequest):
        """
        Save the API key to the configuration file.
        
        Args:
            request: ApiKeyRequest containing the API key and provider.
            
        Returns:
            JSONResponse with success status.
        """
        base_dir = _get_base_dir()
        conf_path = base_dir / "conf.yaml"
        
        if not conf_path.exists():
            # Try to create from template
            template_path = base_dir / "config_templates" / "conf.default.yaml"
            if template_path.exists():
                import shutil
                shutil.copy(template_path, conf_path)
            else:
                raise HTTPException(
                    status_code=404,
                    detail="Configuration file not found and no template available"
                )
        
        try:
            # Load existing config
            with open(conf_path, "r", encoding="utf-8") as f:
                config = yaml.load(f)
            
            if config is None:
                raise HTTPException(status_code=500, detail="Failed to parse configuration file")
            
            # Navigate to the LLM config section and update API key
            provider = request.provider
            
            # The config structure is:
            # character_config:
            #   agent_config:
            #     llm_configs:
            #       openai_llm:
            #         llm_api_key: '...'
            character_config = config.get("character_config", {})
            agent_config = character_config.get("agent_config", {})
            llm_configs = agent_config.get("llm_configs", {})
            
            if provider not in llm_configs:
                raise HTTPException(
                    status_code=400,
                    detail=f"Provider '{provider}' not found in configuration"
                )
            
            # Update the API key
            llm_configs[provider]["llm_api_key"] = request.api_key
            
            # Also set this provider as the active one
            agent_settings = agent_config.get("agent_settings", {})
            basic_memory_agent = agent_settings.get("basic_memory_agent", {})
            basic_memory_agent["llm_provider"] = provider
            
            # Save the updated config
            with open(conf_path, "w", encoding="utf-8") as f:
                yaml.dump(config, f)
            
            logger.info(f"✅ API key saved successfully for provider: {provider}")
            return JSONResponse({"success": True, "message": "API key saved successfully"})
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to save API key: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save API key: {str(e)}")
    
    @router.post("/computer-use")
    async def save_computer_use_config(request: ComputerUseRequest):
        """
        Save the computer use configuration.
        
        Args:
            request: ComputerUseRequest containing the enabled status.
            
        Returns:
            JSONResponse with success status.
        """
        base_dir = _get_base_dir()
        conf_path = base_dir / "conf.yaml"
        
        if not conf_path.exists():
            # Try to create from template
            template_path = base_dir / "config_templates" / "conf.default.yaml"
            if template_path.exists():
                import shutil
                shutil.copy(template_path, conf_path)
            else:
                raise HTTPException(
                    status_code=404,
                    detail="Configuration file not found and no template available"
                )
        
        try:
            # Load existing config
            with open(conf_path, "r", encoding="utf-8") as f:
                config = yaml.load(f)
            
            if config is None:
                raise HTTPException(status_code=500, detail="Failed to parse configuration file")
            
            # Update computer_use_config
            if "computer_use_config" not in config:
                config["computer_use_config"] = {}
            
            config["computer_use_config"]["enabled"] = request.enabled
            
            # Save the updated config
            with open(conf_path, "w", encoding="utf-8") as f:
                yaml.dump(config, f)
            
            logger.info(f"✅ Computer Use config saved: enabled={request.enabled}")
            return JSONResponse({"success": True, "message": "Computer Use config saved successfully"})
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to save Computer Use config: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")

    @router.get("/status")
    async def get_config_status():
        """
        Check if the configuration is properly set up.
        
        Returns:
            JSONResponse with configuration status.
        """
        base_dir = _get_base_dir()
        conf_path = base_dir / "conf.yaml"
        
        if not conf_path.exists():
            return JSONResponse({
                "configured": False,
                "message": "Configuration file not found"
            })
        
        try:
            with open(conf_path, "r", encoding="utf-8") as f:
                config = yaml.load(f)
            
            if config is None:
                return JSONResponse({
                    "configured": False,
                    "message": "Configuration file is empty"
                })
            
            # Check if OpenAI API key is set
            # Config structure: character_config.agent_config.llm_configs.openai_llm
            character_config = config.get("character_config", {})
            agent_config = character_config.get("agent_config", {})
            llm_configs = agent_config.get("llm_configs", {})
            openai_config = llm_configs.get("openai_llm", {})
            api_key = openai_config.get("llm_api_key", "")
            
            has_valid_key = bool(api_key) and not api_key.startswith("${") and api_key != "Your Open AI API key"
            
            return JSONResponse({
                "configured": has_valid_key,
                "provider": "openai_llm" if has_valid_key else None,
                "message": "Configuration is valid" if has_valid_key else "API key not configured"
            })
            
        except Exception as e:
            logger.error(f"Error checking config status: {e}")
            return JSONResponse({
                "configured": False,
                "message": f"Error reading configuration: {str(e)}"
            })
    
    return router


def init_client_ws_route(default_context_cache: ServiceContext) -> APIRouter:
    """
    Create and return API routes for handling the `/client-ws` WebSocket connections.

    Args:
        default_context_cache: Default service context cache for new sessions.

    Returns:
        APIRouter: Configured router with WebSocket endpoint.
    """

    router = APIRouter()
    ws_handler = WebSocketHandler(default_context_cache)

    @router.websocket("/client-ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket endpoint for client connections"""
        await websocket.accept()
        client_uid = str(uuid4())

        try:
            await ws_handler.handle_new_connection(websocket, client_uid)
            await ws_handler.handle_websocket_communication(websocket, client_uid)
        except WebSocketDisconnect:
            await ws_handler.handle_disconnect(client_uid)
        except Exception as e:
            logger.error(f"Error in WebSocket connection: {e}")
            await ws_handler.handle_disconnect(client_uid)
            raise

    return router


def init_proxy_route(server_url: str) -> APIRouter:
    """
    Create and return API routes for handling proxy connections.

    Args:
        server_url: The WebSocket URL of the actual server

    Returns:
        APIRouter: Configured router with proxy WebSocket endpoint
    """
    router = APIRouter()
    proxy_handler = ProxyHandler(server_url)

    @router.websocket("/proxy-ws")
    async def proxy_endpoint(websocket: WebSocket):
        """WebSocket endpoint for proxy connections"""
        try:
            await proxy_handler.handle_client_connection(websocket)
        except Exception as e:
            logger.error(f"Error in proxy connection: {e}")
            raise

    return router


def init_webtool_routes(default_context_cache: ServiceContext) -> APIRouter:
    """
    Create and return API routes for handling web tool interactions.

    Args:
        default_context_cache: Default service context cache for new sessions.

    Returns:
        APIRouter: Configured router with WebSocket endpoint.
    """

    router = APIRouter()

    @router.get("/web-tool")
    async def web_tool_redirect():
        """Redirect /web-tool to /web_tool/index.html"""
        return Response(status_code=302, headers={"Location": "/web-tool/index.html"})

    @router.get("/web_tool")
    async def web_tool_redirect_alt():
        """Redirect /web_tool to /web_tool/index.html"""
        return Response(status_code=302, headers={"Location": "/web-tool/index.html"})

    @router.get("/live2d-models/info")
    async def get_live2d_folder_info():
        """Get information about available Live2D models"""
        live2d_dir = "live2d-models"
        if not os.path.exists(live2d_dir):
            return JSONResponse(
                {"error": "Live2D models directory not found"}, status_code=404
            )

        valid_characters = []
        supported_extensions = [".png", ".jpg", ".jpeg"]

        for entry in os.scandir(live2d_dir):
            if entry.is_dir():
                folder_name = entry.name.replace("\\", "/")
                model3_file = os.path.join(
                    live2d_dir, folder_name, f"{folder_name}.model3.json"
                ).replace("\\", "/")

                if os.path.isfile(model3_file):
                    # Find avatar file if it exists
                    avatar_file = None
                    for ext in supported_extensions:
                        avatar_path = os.path.join(
                            live2d_dir, folder_name, f"{folder_name}{ext}"
                        )
                        if os.path.isfile(avatar_path):
                            avatar_file = avatar_path.replace("\\", "/")
                            break

                    valid_characters.append(
                        {
                            "name": folder_name,
                            "avatar": avatar_file,
                            "model_path": model3_file,
                        }
                    )
        return JSONResponse(
            {
                "type": "live2d-models/info",
                "count": len(valid_characters),
                "characters": valid_characters,
            }
        )

    @router.post("/asr")
    async def transcribe_audio(file: UploadFile = File(...)):
        """
        Endpoint for transcribing audio using the ASR engine
        """
        logger.info(f"Received audio file for transcription: {file.filename}")

        try:
            contents = await file.read()

            # Validate minimum file size
            if len(contents) < 44:  # Minimum WAV header size
                raise ValueError("Invalid WAV file: File too small")

            # Decode the WAV header and get actual audio data
            wav_header_size = 44  # Standard WAV header size
            audio_data = contents[wav_header_size:]

            # Validate audio data size
            if len(audio_data) % 2 != 0:
                raise ValueError("Invalid audio data: Buffer size must be even")

            # Convert to 16-bit PCM samples to float32
            try:
                audio_array = (
                    np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
                    / 32768.0
                )
            except ValueError as e:
                raise ValueError(
                    f"Audio format error: {str(e)}. Please ensure the file is 16-bit PCM WAV format."
                )

            # Validate audio data
            if len(audio_array) == 0:
                raise ValueError("Empty audio data")

            text = await default_context_cache.asr_engine.async_transcribe_np(
                audio_array
            )
            logger.info(f"Transcription result: {text}")
            return {"text": text}

        except ValueError as e:
            logger.error(f"Audio format error: {e}")
            return Response(
                content=json.dumps({"error": str(e)}),
                status_code=400,
                media_type="application/json",
            )
        except Exception as e:
            logger.error(f"Error during transcription: {e}")
            return Response(
                content=json.dumps(
                    {"error": "Internal server error during transcription"}
                ),
                status_code=500,
                media_type="application/json",
            )

    @router.websocket("/tts-ws")
    async def tts_endpoint(websocket: WebSocket):
        """WebSocket endpoint for TTS generation"""
        await websocket.accept()
        logger.info("TTS WebSocket connection established")

        try:
            while True:
                data = await websocket.receive_json()
                text = data.get("text")
                if not text:
                    continue

                logger.info(f"Received text for TTS: {text}")

                # Split text into sentences
                sentences = [s.strip() for s in text.split(".") if s.strip()]

                try:
                    # Generate and send audio for each sentence
                    for sentence in sentences:
                        sentence = sentence + "."  # Add back the period
                        file_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid4())[:8]}"
                        audio_path = (
                            await default_context_cache.tts_engine.async_generate_audio(
                                text=sentence, file_name_no_ext=file_name
                            )
                        )
                        logger.info(
                            f"Generated audio for sentence: {sentence} at: {audio_path}"
                        )

                        await websocket.send_json(
                            {
                                "status": "partial",
                                "audioPath": audio_path,
                                "text": sentence,
                            }
                        )

                    # Send completion signal
                    await websocket.send_json({"status": "complete"})

                except Exception as e:
                    logger.error(f"Error generating TTS: {e}")
                    await websocket.send_json({"status": "error", "message": str(e)})

        except WebSocketDisconnect:
            logger.info("TTS WebSocket client disconnected")
        except Exception as e:
            logger.error(f"Error in TTS WebSocket connection: {e}")
            await websocket.close()

    return router
