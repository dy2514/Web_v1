# blueprint_registry.py - Blueprint 등록 관리

import logging
from typing import List, Dict, Any, Optional
from flask import Blueprint

logger = logging.getLogger(__name__)

class BlueprintRegistry:
    """Blueprint 등록 관리 클래스"""
    
    def __init__(self):
        self.blueprints: List[Blueprint] = []
        self.blueprint_configs: Dict[str, Dict[str, Any]] = {}
    
    def register_blueprint(self, blueprint: Blueprint, config: Optional[Dict[str, Any]] = None):
        """Blueprint 등록"""
        blueprint_name = blueprint.name
        
        # 중복 등록 방지
        if any(bp.name == blueprint_name for bp in self.blueprints):
            logger.warning(f"Blueprint '{blueprint_name}' is already registered")
            return False
        
        self.blueprints.append(blueprint)
        
        if config:
            self.blueprint_configs[blueprint_name] = config
            logger.info(f"Blueprint '{blueprint_name}' registered with config")
        else:
            logger.info(f"Blueprint '{blueprint_name}' registered")
        
        return True
    
    def get_blueprint(self, name: str) -> Optional[Blueprint]:
        """Blueprint 조회"""
        for blueprint in self.blueprints:
            if blueprint.name == name:
                return blueprint
        return None
    
    def get_all_blueprints(self) -> List[Blueprint]:
        """모든 Blueprint 반환"""
        return self.blueprints.copy()
    
    def get_blueprint_config(self, name: str) -> Optional[Dict[str, Any]]:
        """Blueprint 설정 조회"""
        return self.blueprint_configs.get(name)
    
    def unregister_blueprint(self, name: str) -> bool:
        """Blueprint 등록 해제"""
        for i, blueprint in enumerate(self.blueprints):
            if blueprint.name == name:
                del self.blueprints[i]
                if name in self.blueprint_configs:
                    del self.blueprint_configs[name]
                logger.info(f"Blueprint '{name}' unregistered")
                return True
        
        logger.warning(f"Blueprint '{name}' not found for unregistration")
        return False
    
    def get_blueprint_stats(self) -> Dict[str, Any]:
        """Blueprint 통계 정보"""
        stats = {
            'total_count': len(self.blueprints),
            'blueprints': []
        }
        
        for blueprint in self.blueprints:
            blueprint_info = {
                'name': blueprint.name,
                'url_prefix': getattr(blueprint, 'url_prefix', None),
                'route_count': len(blueprint.deferred_functions),
                'config': self.blueprint_configs.get(blueprint.name, {})
            }
            stats['blueprints'].append(blueprint_info)
        
        return stats
    
    def validate_blueprint_routes(self, blueprint_name: str) -> Dict[str, Any]:
        """Blueprint 라우트 유효성 검사"""
        blueprint = self.get_blueprint(blueprint_name)
        if not blueprint:
            return {'valid': False, 'error': f"Blueprint '{blueprint_name}' not found"}
        
        validation_result = {
            'valid': True,
            'blueprint_name': blueprint_name,
            'routes': [],
            'errors': []
        }
        
        try:
            for rule in blueprint.url_map.iter_rules():
                route_info = {
                    'rule': str(rule.rule),
                    'methods': list(rule.methods),
                    'endpoint': rule.endpoint
                }
                validation_result['routes'].append(route_info)
            
            logger.info(f"Blueprint '{blueprint_name}' validation completed")
            
        except Exception as e:
            validation_result['valid'] = False
            validation_result['errors'].append(str(e))
            logger.error(f"Blueprint '{blueprint_name}' validation failed: {e}")
        
        return validation_result
    
    def get_route_summary(self) -> Dict[str, List[str]]:
        """라우트 요약 정보"""
        summary = {}
        
        for blueprint in self.blueprints:
            routes = []
            try:
                for rule in blueprint.url_map.iter_rules():
                    route_info = f"{rule.methods} {rule.rule} -> {rule.endpoint}"
                    routes.append(route_info)
            except Exception as e:
                logger.error(f"Error getting routes for blueprint '{blueprint.name}': {e}")
                routes = [f"Error: {str(e)}"]
            
            summary[blueprint.name] = routes
        
        return summary

# 전역 Blueprint Registry 인스턴스
_blueprint_registry = None

def get_blueprint_registry() -> BlueprintRegistry:
    """전역 Blueprint Registry 인스턴스 반환"""
    global _blueprint_registry
    if _blueprint_registry is None:
        _blueprint_registry = BlueprintRegistry()
    return _blueprint_registry

def register_blueprint(blueprint: Blueprint, config: Optional[Dict[str, Any]] = None):
    """Blueprint 등록 편의 함수"""
    registry = get_blueprint_registry()
    return registry.register_blueprint(blueprint, config)

def get_blueprint_stats() -> Dict[str, Any]:
    """Blueprint 통계 정보 반환"""
    registry = get_blueprint_registry()
    return registry.get_blueprint_stats()

def validate_all_blueprints() -> Dict[str, Any]:
    """모든 Blueprint 유효성 검사"""
    registry = get_blueprint_registry()
    results = {}
    
    for blueprint in registry.get_all_blueprints():
        results[blueprint.name] = registry.validate_blueprint_routes(blueprint.name)
    
    return results
