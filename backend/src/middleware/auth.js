const { supabase } = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        mensagem: 'Token de autenticação não fornecido' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        mensagem: 'Token inválido ou expirado' 
      });
    }

    // Adicionar usuário ao request
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({ 
      success: false, 
      mensagem: 'Erro ao verificar autenticação' 
    });
  }
};

module.exports = authMiddleware;